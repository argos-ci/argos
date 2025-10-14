import { invariant } from "@argos/util/invariant";
import { captureException } from "@sentry/node";
import pTimeout from "p-timeout";
import { TimeoutError } from "redis";

import {
  Artifact,
  Build,
  BuildShard,
  GithubRepository,
  Project,
} from "@/database/models/index.js";
import { checkErrorStatus, getInstallationOctokit } from "@/github/index.js";
import logger from "@/logger/index.js";

import { finalizeBuild } from "./finalizeBuild.js";
import { job as buildJob } from "./job.js";

/**
 * Check if the build is a partial build.
 * It means the build is a rerun of a previous build and only a subset of the jobs are run.
 * To determine if a build is a partial build, we compare the jobs of the current run with the jobs of the previous run.
 * Only GitHub Actions builds are supported.
 */
export async function checkIsPartialBuild(input: {
  ciProvider: string | null;
  runId: string | null;
  runAttempt: number | null;
  project: Project;
}) {
  const { runAttempt, runId, ciProvider } = input;
  const isEligibleBuild =
    ciProvider === "github-actions" && runAttempt && runAttempt > 1 && runId;

  if (!isEligibleBuild) {
    return false;
  }

  const project = input.project.$clone();

  await project.$fetchGraph(
    "githubRepository.[githubAccount,repoInstallations.installation]",
  );

  const { githubRepository } = project;

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

  const previousRunAttempt = runAttempt - 1;

  const getJobsForRunAttempt = async (attempt: number) => {
    try {
      return await pTimeout(
        octokit.actions.listJobsForWorkflowRunAttempt({
          attempt_number: attempt,
          owner: githubAccount.login,
          repo: githubRepository.name,
          run_id: Number(runId),
          per_page: 30,
        }),
        { milliseconds: 5000 },
      );
    } catch (error) {
      if (error instanceof TimeoutError) {
        logger.error("Timeout while fetching jobs for run attempt", {
          runId,
          runAttempt: attempt,
          error: error.message,
        });
        return null;
      }
      if (checkErrorStatus(404, error)) {
        return null;
      }

      throw error;
    }
  };

  try {
    const [previousRun, currentRun] = await Promise.all([
      getJobsForRunAttempt(previousRunAttempt),
      getJobsForRunAttempt(runAttempt),
    ]);

    if (!previousRun || !currentRun) {
      return false;
    }

    const previousRunJobs = previousRun.data.jobs;
    const currentRunJobs = currentRun.data.jobs;

    // If we find a similar job that has already succeeded in the previous run,
    // it means the current run is a partial run.
    const partial = currentRunJobs.some((currentJob) => {
      return previousRunJobs.some(
        (previousJob) =>
          previousJob.name === currentJob.name &&
          previousJob.conclusion === "success" &&
          previousJob.started_at === currentJob.started_at,
      );
    });

    return partial;
  } catch (error) {
    captureException(error, {
      extra: { context: "Failed to check if build is partial" },
    });
    return false;
  }
}

/**
 * Finalize partial builds by inserting missing screenshots from the previous run.
 */
export async function finalizePartialBuilds(input: {
  runId: string;
  runAttempt: number;
}) {
  if (input.runAttempt === 1) {
    return;
  }

  const builds = await Build.query()
    .withGraphFetched("shards")
    .where("runId", input.runId)
    .where("runAttempt", input.runAttempt)
    .where("ciProvider", "github-actions")
    .where("jobStatus", "pending")
    .where("partial", true)
    .whereNotNull("totalBatch");

  await Promise.all(
    builds.map(async (build) => {
      const previousBuild = await Build.query()
        .withGraphFetched("shards.artifacts")
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

      invariant(build.shards, "Shards should be fetched");
      invariant(previousBuild.shards, "Shards should be fetched");

      const currentShardIndices = build.shards.map((shard) => shard.index);
      const missingShards = previousBuild.shards.filter(
        (shard) => !currentShardIndices.includes(shard.index),
      );

      if (missingShards.length === 0) {
        return;
      }

      const insertedShards = await BuildShard.query()
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

      const missingArtifactss = missingShards.flatMap((shard, index) => {
        const insertedShard = insertedShards[index];
        invariant(insertedShard, "Inserted shard should be found");
        invariant(shard.artifacts, "Artifacts should be fetched");
        return shard.artifacts.map((artifact) => {
          return {
            name: artifact.name,
            s3Id: artifact.s3Id,
            artifactBucketId: build.headArtifactBucketId,
            fileId: artifact.fileId,
            testId: artifact.testId,
            metadata: artifact.metadata,
            playwrightTraceFileId: artifact.playwrightTraceFileId,
            buildShardId: insertedShard.id,
          };
        });
      });

      if (missingArtifactss.length > 0) {
        await Artifact.query().insert(missingArtifactss);
      }

      await finalizeBuild({ build });
      await buildJob.push(build.id);
    }),
  );
}
