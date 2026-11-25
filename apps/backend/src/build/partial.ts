import { invariant } from "@argos/util/invariant";
import { chunk } from "lodash-es";

import { transaction } from "@/database";
import {
  Build,
  BuildShard,
  GithubRepository,
  Screenshot,
  ScreenshotBucket,
} from "@/database/models";
import { checkOctokitErrorStatus, getInstallationOctokit } from "@/github";
import { createJob } from "@/job-core";
import { DEFAULT_RETRY_LADDER } from "@/job-core/backoff";

import { finalizeBuild } from "./finalizeBuild";
import { job as buildJob } from "./job";

/**
 * Postgres takes at most 65,535 bind parameters in a statement, and a copied
 * screenshot takes 14.
 */
const SCREENSHOT_INSERT_BATCH_SIZE = 1000;

/**
 * Check if the build comes from a partial rerun: a rerun of a GitHub Actions
 * workflow where only a subset of the jobs ran again. The jobs it did not run
 * again are listed in its run attempt with their original start, before the
 * attempt started.
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

  const params = {
    owner: githubAccount.login,
    repo: githubRepository.name,
    run_id: Number(runId),
    attempt_number: runAttempt,
  };

  try {
    const { data: attempt } =
      await octokit.actions.getWorkflowRunAttempt(params);
    invariant(attempt.run_started_at, "Expected the run attempt to be started");
    const attemptStartedAt = Date.parse(attempt.run_started_at);

    for await (const { data: jobs } of octokit.paginate.iterator(
      octokit.actions.listJobsForWorkflowRunAttempt,
      { ...params, per_page: 100 },
    )) {
      const hasCarriedOverJob = jobs.some(
        (job) =>
          job.conclusion === "success" &&
          Date.parse(job.started_at) < attemptStartedAt,
      );
      if (hasCarriedOverJob) {
        return true;
      }
    }

    return false;
  } catch (error) {
    if (checkOctokitErrorStatus(404, error)) {
      return false;
    }

    throw error;
  }
}

/**
 * Finalize the build of a partial rerun, by copying the shards it did not run
 * again from the latest complete attempt before it.
 */
export async function finalizePartialBuild(buildId: string) {
  const build = await Build.query()
    .findById(buildId)
    .withGraphFetched("[shards, compareScreenshotBucket]")
    .throwIfNotFound();

  invariant(build.shards, "Relation `shards` should be fetched");
  invariant(
    build.compareScreenshotBucket,
    "Relation `compareScreenshotBucket` should be fetched",
  );

  // Finalized from the shards it got, by `argos finalize` for instance.
  if (build.compareScreenshotBucket.complete) {
    return;
  }

  const previousBuild = await Build.query()
    .select("builds.*")
    .withGraphFetched("shards")
    .joinRelated("compareScreenshotBucket")
    .where("compareScreenshotBucket.complete", true)
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

  invariant(previousBuild.shards, "Relation `shards` should be fetched");

  // Older SDKs upload shards without `parallelIndex`: they cannot be matched.
  const shards = [...build.shards, ...previousBuild.shards];
  if (shards.some((shard) => shard.index === null)) {
    return;
  }

  const shardIndices = new Set(build.shards.map((shard) => shard.index));
  const missingShards = previousBuild.shards.filter(
    (shard) => !shardIndices.has(shard.index),
  );

  if (missingShards.length === 0) {
    return;
  }

  // A full rerun can miss shards too, when some of its jobs were cancelled.
  if (!(await checkIsPartialBuild(build))) {
    return;
  }

  const finalized = await transaction(async (trx) => {
    // Locked so that two runs cannot both copy the shards.
    const bucket = await ScreenshotBucket.query(trx)
      .findById(build.compareScreenshotBucketId)
      .forUpdate()
      .throwIfNotFound();

    if (bucket.complete) {
      return false;
    }

    for (const shard of missingShards) {
      const copy = await BuildShard.query(trx).insert({
        buildId: build.id,
        index: shard.index,
        metadata: shard.metadata,
      });
      const screenshots = await Screenshot.query(trx).where(
        "buildShardId",
        shard.id,
      );
      for (const batch of chunk(screenshots, SCREENSHOT_INSERT_BATCH_SIZE)) {
        await Screenshot.query(trx).insert(
          batch.map((screenshot) => ({
            ...Screenshot.partialClone(screenshot),
            screenshotBucketId: build.compareScreenshotBucketId,
            buildShardId: copy.id,
          })),
        );
      }
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
export const partialBuildJob = createJob<string>(
  "partialBuild",
  { perform: finalizePartialBuild },
  {
    timeout: 60_000,
    // The last attempts outlast the hourly reset of GitHub's rate limit.
    retryLadder: [
      ...DEFAULT_RETRY_LADDER,
      { label: "30m", delay: 30 * 60 * 1000 },
      { label: "1h", delay: 60 * 60 * 1000 },
    ],
  },
);

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
