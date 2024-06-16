import { invariant } from "@argos/util/invariant";
import pTimeout from "p-timeout";

import {
  Build,
  BuildShard,
  Project,
  Screenshot,
} from "@/database/models/index.js";
import { insertFilesAndScreenshots } from "@/database/services/screenshots";
import { getInstallationOctokit } from "@/github/index.js";
import logger from "@/logger/index.js";

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
    "githubRepository.[githubAccount,activeInstallation]",
  );

  const { githubRepository } = project;

  if (!githubRepository) {
    return false;
  }

  const githubAccount = githubRepository.githubAccount;

  invariant(githubAccount, "No github account found");

  const installation = githubRepository.activeInstallation;

  if (!installation) {
    return false;
  }

  const octokit = await getInstallationOctokit(installation.id);

  if (!octokit) {
    return false;
  }

  const previousRunAttempt = runAttempt - 1;

  const getJobsForRunAttempt = (attempt: number) => {
    return pTimeout(
      octokit.actions.listJobsForWorkflowRunAttempt({
        attempt_number: attempt,
        owner: githubAccount.login,
        repo: githubRepository.name,
        run_id: Number(runId),
        per_page: 30,
      }),
      { milliseconds: 5000 },
    );
  };

  try {
    const [previousRun, currentRun] = await Promise.all([
      getJobsForRunAttempt(previousRunAttempt),
      getJobsForRunAttempt(runAttempt),
    ]);

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
    logger.error("Failed to check if the build is a partial build", error);
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
    .where("ciProvider", "github-actions")
    .where("runId", input.runId)
    .where("runAttempt", input.runAttempt)
    .where("jobStatus", "pending")
    .where("partial", true)
    .joinRelated("compareScreenshotBucket")
    .where("compareScreenshotBucket.complete", false)
    .withGraphFetched("shards");

  await Promise.all(
    builds.map(async (build) => {
      const previousBuild = await Build.query()
        .where("ciProvider", "github-actions")
        .where("projectId", build.projectId)
        .where("runId", build.runId)
        .where("runAttempt", "<", build.runAttempt)
        .where("name", build.name)
        .joinRelated("compareScreenshotBucket")
        .where("compareScreenshotBucket.complete", true)
        .withGraphFetched("shards.screenshots.playwrightTraceFile")
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

      await Promise.all(
        missingShards.map(async (shard) => {
          invariant(shard.screenshots, "Screenshots should be fetched");
          const copiedShard = await BuildShard.query().insertAndFetch({
            buildId: build.id,
            index: shard.index,
          });
          await insertFilesAndScreenshots({
            screenshots: shard.screenshots.map((screenshot) => ({
              key: screenshot.s3Id,
              name: screenshot.name,
              metadata: screenshot.metadata,
              pwTraceKey: screenshot.playwrightTraceFile?.key ?? null,
            })),
            shard: copiedShard,
            build,
          });
        }),
      );

      const screenshotCount = await Screenshot.query()
        .where("screenshotBucketId", build.compareScreenshotBucketId)
        .resultSize();

      await build
        .$relatedQuery("compareScreenshotBucket")
        .patch({ complete: true, screenshotCount });

      await buildJob.push(build.id);
    }),
  );
}
