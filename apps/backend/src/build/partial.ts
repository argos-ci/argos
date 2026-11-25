import { invariant } from "@argos/util/invariant";
import type { TransactionOrKnex } from "objection";

import { transaction } from "@/database";
import {
  Build,
  BuildShard,
  GithubRepository,
  Screenshot,
} from "@/database/models";
import { checkOctokitErrorStatus, getInstallationOctokit } from "@/github";
import { createJob } from "@/job-core";

import { finalizeBuild } from "./finalizeBuild";
import { job as buildJob } from "./job";

/**
 * Check if the build comes from a partial rerun: a rerun of a GitHub Actions
 * workflow where only a subset of the jobs ran again. To find out, compare the
 * jobs of the run attempt with the jobs of the previous one.
 */
async function checkIsPartialBuild(build: Build): Promise<boolean> {
  const { runId, runAttempt } = build;
  invariant(runId && runAttempt, "Expected a GitHub Actions run attempt");

  await build.$fetchGraph(
    "project.githubRepository.[githubAccount,repoInstallations.installation]",
  );

  invariant(build.project, "Relation `project` should be fetched");
  const { githubRepository } = build.project;

  if (!githubRepository) {
    return false;
  }

  const githubAccount = githubRepository.githubAccount;

  invariant(githubAccount, "Relation `githubAccount` should be fetched");

  const installation = GithubRepository.pickBestInstallation(githubRepository);

  if (!installation) {
    return false;
  }

  // For now we don't support partial builds for light installations.
  if (installation.app === "light") {
    return false;
  }

  const octokit = await getInstallationOctokit(installation);

  if (!octokit) {
    return false;
  }

  const getJobsForRunAttempt = async (attempt: number) => {
    try {
      return await octokit.actions.listJobsForWorkflowRunAttempt({
        attempt_number: attempt,
        owner: githubAccount.login,
        repo: githubRepository.name,
        run_id: Number(runId),
        per_page: 30,
      });
    } catch (error) {
      if (checkOctokitErrorStatus(404, error)) {
        return null;
      }

      throw error;
    }
  };

  const [previousRun, currentRun] = await Promise.all([
    getJobsForRunAttempt(runAttempt - 1),
    getJobsForRunAttempt(runAttempt),
  ]);

  if (!previousRun || !currentRun) {
    return false;
  }

  const previousRunJobs = previousRun.data.jobs;
  const currentRunJobs = currentRun.data.jobs;

  // If we find a similar job that has already succeeded in the previous run,
  // it means the current run is a partial run.
  return currentRunJobs.some((currentJob) => {
    return previousRunJobs.some(
      (previousJob) =>
        previousJob.name === currentJob.name &&
        previousJob.conclusion === "success" &&
        previousJob.started_at === currentJob.started_at,
    );
  });
}

/**
 * Finalize the build of a partial rerun, by inserting the shards it did not
 * run again from the previous run attempt.
 */
export async function finalizePartialBuild(buildId: string) {
  const build = await Build.query().findById(buildId).throwIfNotFound();

  const previousBuild = await Build.query()
    .withGraphFetched("shards")
    .where("builds.runId", build.runId)
    .where("builds.projectId", build.projectId)
    .where("builds.name", build.name)
    .where("builds.ciProvider", "github-actions")
    .where("builds.runAttempt", "<", build.runAttempt)
    .orderBy("builds.runAttempt", "desc")
    .first();

  if (!previousBuild) {
    return;
  }

  const getMissingShards = async (trx?: TransactionOrKnex) => {
    invariant(previousBuild.shards, "Shards should be fetched");
    const shards = await BuildShard.query(trx)
      .select("index")
      .where("buildId", build.id);
    const shardIndices = shards.map((shard) => shard.index);
    return previousBuild.shards.filter(
      (shard) => !shardIndices.includes(shard.index),
    );
  };

  if ((await getMissingShards()).length === 0) {
    return;
  }

  // A full rerun can miss shards too, when some of its jobs were cancelled.
  if (!(await checkIsPartialBuild(build))) {
    return;
  }

  const finalized = await transaction(async (trx) => {
    // Two runs for the same build must not both insert the missing shards.
    await Build.query(trx).findById(build.id).forUpdate();
    const missingShards = await getMissingShards(trx);

    if (missingShards.length === 0) {
      return false;
    }

    await BuildShard.fetchGraph(missingShards, "screenshots", {
      transaction: trx,
    });

    const insertedShards = await BuildShard.query(trx)
      .insert(
        missingShards.map((shard) => {
          return {
            buildId: build.id,
            index: shard.index,
            metadata: shard.metadata,
          };
        }),
      )
      .returning("id");

    const missingScreenshots = missingShards.flatMap((shard, index) => {
      const insertedShard = insertedShards[index];
      invariant(insertedShard, "Inserted shard should be found");
      invariant(shard.screenshots, "Screenshots should be fetched");
      return shard.screenshots.map((screenshot) => {
        return {
          ...Screenshot.partialClone(screenshot),
          screenshotBucketId: build.compareScreenshotBucketId,
          buildShardId: insertedShard.id,
        };
      });
    });

    if (missingScreenshots.length > 0) {
      await Screenshot.query(trx).insert(missingScreenshots);
    }

    await Build.query(trx).findById(build.id).patch({ partial: true });
    await finalizeBuild({ build, trx });
    return true;
  });

  if (finalized) {
    await buildJob.push(build.id);
  }
}

/**
 * Finalize partial reruns off the webhook: GitHub is asked whether a rerun is
 * partial, and a failing answer is retried instead of leaving the build
 * waiting for shards that would never come.
 */
export const partialBuildJob = createJob<string>("partialBuild", {
  perform: finalizePartialBuild,
});

/**
 * Queue the builds of a GitHub Actions run attempt that may be partial reruns,
 * once the workflow run is completed.
 */
export async function finalizePartialBuilds(input: {
  runId: string;
  runAttempt: number;
}) {
  if (input.runAttempt === 1) {
    return;
  }

  const builds = await Build.query()
    .select("id")
    .where("runId", input.runId)
    .where("runAttempt", input.runAttempt)
    .where("ciProvider", "github-actions")
    .where("jobStatus", "pending")
    .whereNotNull("totalBatch");

  if (builds.length > 0) {
    await partialBuildJob.push(...builds.map((build) => build.id));
  }
}
