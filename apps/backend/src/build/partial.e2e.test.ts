import { invariant } from "@argos/util/invariant";
import { test as base, describe, expect } from "vitest";

import {
  createGithubRepository,
  setupGithubServer,
  stubWorkflowRunJobs,
} from "@/auth/tokenless/github-actions.test-util";
import { Build, BuildShard } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { finalizePartialBuilds } from "./partial";

const runId = 42;
const firstStart = "2026-11-25T09:28:00Z";
const rerunStart = "2026-11-25T09:47:00Z";

/**
 * Create the build of one attempt of run {@link runId}, split in three
 * shards, with one screenshot uploaded by each shard in `shardIndices`.
 */
async function createAttemptBuild(input: {
  projectId: string;
  runAttempt: number;
  shardIndices: number[];
  complete: boolean;
}) {
  const bucket = await factory.ScreenshotBucket.create({
    projectId: input.projectId,
    complete: input.complete,
  });
  const build = await factory.Build.create({
    projectId: input.projectId,
    compareScreenshotBucketId: bucket.id,
    jobStatus: input.complete ? "complete" : "pending",
    ciProvider: "github-actions",
    runId: String(runId),
    runAttempt: input.runAttempt,
    totalBatch: 3,
    batchCount: input.shardIndices.length,
  });
  for (const index of input.shardIndices) {
    const shard = await BuildShard.query().insertAndFetch({
      buildId: build.id,
      index,
      metadata: null,
    });
    await factory.Screenshot.create({
      name: `shard-${index}`,
      screenshotBucketId: bucket.id,
      buildShardId: shard.id,
    });
  }
  return build;
}

const test = base.extend<{ rerun: Build }>({
  rerun: async ({}, use) => {
    await setupDatabase();
    const repository = await createGithubRepository();
    const project = await factory.Project.create({
      githubRepositoryId: repository.id,
    });
    await createAttemptBuild({
      projectId: project.id,
      runAttempt: 1,
      shardIndices: [1, 2, 3],
      complete: true,
    });
    const rerun = await createAttemptBuild({
      projectId: project.id,
      runAttempt: 2,
      shardIndices: [2],
      complete: false,
    });
    await use(rerun);
  },
});

async function getRerunState(rerun: Build) {
  const [build, shards] = await Promise.all([
    Build.query()
      .findById(rerun.id)
      .withGraphFetched("compareScreenshotBucket")
      .throwIfNotFound(),
    BuildShard.query().where("buildId", rerun.id).orderBy("index"),
  ]);
  invariant(build.compareScreenshotBucket, "Bucket should be fetched");
  return {
    partial: build.partial,
    shardIndices: shards.map((shard) => shard.index),
    complete: build.compareScreenshotBucket.complete,
    screenshotCount: build.compareScreenshotBucket.screenshotCount,
  };
}

describe("finalizePartialBuilds", () => {
  setupGithubServer();

  test("completes a rerun of the failed jobs with the shards of the previous attempt", async ({
    rerun,
  }) => {
    stubWorkflowRunJobs(runId, {
      1: [
        { name: "test (1/3)", conclusion: "success", started_at: firstStart },
        { name: "test (2/3)", conclusion: "failure", started_at: firstStart },
        { name: "test (3/3)", conclusion: "success", started_at: firstStart },
      ],
      2: [
        { name: "test (1/3)", conclusion: "success", started_at: firstStart },
        { name: "test (2/3)", conclusion: "success", started_at: rerunStart },
        { name: "test (3/3)", conclusion: "success", started_at: firstStart },
      ],
    });

    await finalizePartialBuilds({ runId: String(runId), runAttempt: 2 });

    expect(await getRerunState(rerun)).toEqual({
      partial: true,
      shardIndices: [1, 2, 3],
      complete: true,
      screenshotCount: 3,
    });
  });

  test("leaves a rerun of all jobs that misses cancelled shards", async ({
    rerun,
  }) => {
    stubWorkflowRunJobs(runId, {
      1: [
        { name: "test (1/3)", conclusion: "success", started_at: firstStart },
        { name: "test (2/3)", conclusion: "success", started_at: firstStart },
        { name: "test (3/3)", conclusion: "success", started_at: firstStart },
      ],
      2: [
        { name: "test (1/3)", conclusion: "cancelled", started_at: rerunStart },
        { name: "test (2/3)", conclusion: "success", started_at: rerunStart },
        { name: "test (3/3)", conclusion: "cancelled", started_at: rerunStart },
      ],
    });

    await finalizePartialBuilds({ runId: String(runId), runAttempt: 2 });

    expect(await getRerunState(rerun)).toEqual({
      partial: false,
      shardIndices: [2],
      complete: false,
      screenshotCount: 0,
    });
  });
});
