import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import type { Account, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { getProjectBuilds } from "./getProjectBuilds";

const app = createTestHandlerApp(getProjectBuilds);

const test = base.extend<{
  account: Account;
  project: Project;
}>({
  account: async ({}, use) => {
    await setupDatabase();
    const account = await factory.TeamAccount.create({ slug: "acme" });
    await use(account);
  },
  project: async ({ account }, use) => {
    const project = await factory.Project.create({
      accountId: account.id,
      name: "web",
      token: "the-awesome-token",
    });
    await use(project);
  },
});

describe("getProjectBuilds", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  describe("without a valid token", () => {
    test("returns 401 status code", async () => {
      await request(app)
        .get("/projects/acme/web/builds")
        .set("Authorization", "Bearer invalid-token")
        .expect((res) => {
          expect(res.body.error).toBe(
            `Project not found in Argos. If the issue persists, verify your token. (token: "invalid-token").`,
          );
        })
        .expect(401);
    });
  });

  test("returns paginated serialized builds for a project token", async ({
    project,
  }) => {
    const [baseBucket, compareBucket] =
      await factory.ScreenshotBucket.createMany(2, [
        {
          projectId: project.id,
          branch: "main",
          commit: "a".repeat(40),
          name: "base",
        },
        {
          projectId: project.id,
          branch: "feature/login",
          commit: "b".repeat(40),
          name: "head",
        },
      ]);
    invariant(baseBucket);
    invariant(compareBucket);

    const build = await factory.Build.create({
      projectId: project.id,
      baseScreenshotBucketId: baseBucket.id,
      compareScreenshotBucketId: compareBucket.id,
      prHeadCommit: "c".repeat(40),
      conclusion: "no-changes",
      stats: {
        failure: 0,
        added: 0,
        unchanged: 1,
        changed: 0,
        removed: 0,
        total: 1,
        retryFailure: 0,
        ignored: 0,
      },
    });

    const res = await request(app)
      .get("/projects/acme/web/builds")
      .set("Authorization", "Bearer the-awesome-token")
      .expect(200);

    expect(res.body.pageInfo).toEqual({
      total: 1,
      page: 1,
      perPage: 30,
    });
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0]).toMatchObject({
      id: build.id,
      number: build.number,
      head: {
        sha: "c".repeat(40),
        branch: "feature/login",
      },
      base: {
        sha: "a".repeat(40),
        branch: "main",
      },
      status: "no-changes",
      conclusion: "no-changes",
      stats: {
        failure: 0,
        added: 0,
        unchanged: 1,
        changed: 0,
        removed: 0,
        total: 1,
        retryFailure: 0,
        ignored: 0,
      },
      metadata: null,
    });
    expect(res.body.results[0].url).toContain(`/builds/${build.number}`);
    expect(res.body.results[0].notification).toMatchObject({
      context: "argos",
      github: { state: "success" },
      gitlab: { state: "success" },
    });
  });

  test("applies head, headSha, and distinctName filters", async ({
    project,
  }) => {
    const [mainBucket, featureBucket, otherFeatureBucket] =
      await factory.ScreenshotBucket.createMany(3, [
        {
          projectId: project.id,
          branch: "main",
          commit: "1".repeat(40),
          name: "main",
        },
        {
          projectId: project.id,
          branch: "feature",
          commit: "2".repeat(40),
          name: "feature",
        },
        {
          projectId: project.id,
          branch: "feature",
          commit: "3".repeat(40),
          name: "feature-2",
        },
      ]);
    invariant(mainBucket);
    invariant(featureBucket);
    invariant(otherFeatureBucket);

    const [olderWebBuild, latestWebBuild, cliBuild] =
      await factory.Build.createMany(3, [
        {
          projectId: project.id,
          name: "web",
          compareScreenshotBucketId: featureBucket.id,
          prHeadCommit: null,
        },
        {
          projectId: project.id,
          name: "web",
          compareScreenshotBucketId: featureBucket.id,
          prHeadCommit: null,
        },
        {
          projectId: project.id,
          name: "cli",
          compareScreenshotBucketId: otherFeatureBucket.id,
          prHeadCommit: "2".repeat(40),
        },
      ]);
    invariant(olderWebBuild);
    invariant(latestWebBuild);
    invariant(cliBuild);

    await factory.Build.createMany(2, [
      {
        projectId: project.id,
        name: "docs",
        compareScreenshotBucketId: mainBucket.id,
        prHeadCommit: "2".repeat(40),
      },
      {
        projectId: project.id,
        name: "ignored",
        compareScreenshotBucketId: otherFeatureBucket.id,
        prHeadCommit: "9".repeat(40),
      },
    ]);

    const res = await request(app)
      .get(
        "/projects/acme/web/builds?head=feature&headSha=2222222222222222222222222222222222222222&distinctName=true",
      )
      .set("Authorization", "Bearer the-awesome-token")
      .expect(200);

    expect(res.body.pageInfo).toEqual({
      total: 2,
      page: 1,
      perPage: 30,
    });
    expect(res.body.results.map((build: { id: string }) => build.id)).toEqual([
      cliBuild.id,
      latestWebBuild.id,
    ]);
    expect(res.body.results).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: olderWebBuild.id }),
      ]),
    );
    expect(
      res.body.results.map(
        (build: { head: { branch: string; sha: string } }) => build.head,
      ),
    ).toEqual([
      {
        branch: "feature",
        sha: "2".repeat(40),
      },
      {
        branch: "feature",
        sha: "2".repeat(40),
      },
    ]);
  });
});
