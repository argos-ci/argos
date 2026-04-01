import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import type { Build, Project } from "@/database/models";
import { UserAccessToken, UserAccessTokenScope } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { getAuthProjectBuilds } from "./getAuthProjectBuilds";

const app = createTestHandlerApp(getAuthProjectBuilds);

const it = base.extend<{
  project: Project;
  builds: Build[];
  factory: typeof factory;
  compareBucketFilter: {
    sha: string;
    prHeadCommit: string;
    branch: string;
    prHeadBranch: string;
    withCompareScreenshotBucket: Build;
    withoutCompareScreenshotBucket: Build;
  };
}>({
  factory: async ({}, use) => {
    await setupDatabase();
    await use(factory);
  },
  project: async ({ factory }, use) => {
    const project = await factory.Project.create({
      token: "the-awesome-token",
    });
    await use(project);
  },
  builds: async ({ factory, project }, use) => {
    const builds = await factory.Build.createMany(3, {
      projectId: project.id,
      name: "default",
    });
    // Sort builds by id desc
    builds.sort((a: Build, b: Build) => Number(b.id) - Number(a.id));
    await use(builds);
  },
  compareBucketFilter: async ({ project, builds }, use) => {
    const sha = "a0a6e27051024a628a3b8e632874f5afc08c5c2d";
    const prHeadCommit = "91d4f24b71c2ef18fb8a5f5f4d2e9d3dcb1a4d6a";
    const branch = "release/v1";
    const prHeadBranch = "feature/pr-head";
    const [withCompareScreenshotBucket, withoutCompareScreenshotBucket] =
      builds;
    invariant(withCompareScreenshotBucket && withoutCompareScreenshotBucket);

    const [compareScreenshotBucket, prHeadScreenshotBucket] =
      await factory.ScreenshotBucket.createMany(2, [
        {
          projectId: project.id,
          name: withCompareScreenshotBucket.name,
          commit: sha,
          branch,
        },
        {
          projectId: project.id,
          name: withoutCompareScreenshotBucket.name,
          commit: "5c63d1eec3417f0d38f6b8c5c2d8f4d1ab9de432",
          branch: prHeadBranch,
        },
      ]);
    invariant(compareScreenshotBucket && prHeadScreenshotBucket);

    await Promise.all([
      withCompareScreenshotBucket.$query().patch({
        compareScreenshotBucketId: compareScreenshotBucket.id,
        prHeadCommit,
      }),
      withoutCompareScreenshotBucket.$query().patch({
        compareScreenshotBucketId: prHeadScreenshotBucket.id,
        prHeadCommit: sha,
      }),
    ]);

    await use({
      sha,
      prHeadCommit,
      branch,
      prHeadBranch,
      withCompareScreenshotBucket,
      withoutCompareScreenshotBucket,
    });
  },
});

describe("getAuthProjectBuilds", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  describe("without a valid token", () => {
    it("returns 401 status code", async () => {
      await request(app)
        .get("/project/builds")
        .set("Authorization", "Bearer invalid-token")
        .expect((res) => {
          expect(res.body.error).toBe(
            `Project not found in Argos. If the issue persists, verify your token. (token: "invalid-token").`,
          );
        })
        .expect(401);
    });
  });

  it("returns a list of project builds sorted by id desc", async ({
    builds,
  }) => {
    await request(app)
      .get("/project/builds")
      .set("Authorization", "Bearer the-awesome-token")
      .expect(200)
      .expect((res) => {
        expect(res.body.results).toHaveLength(3);
        expect(res.body.results.map((b: Build) => b.id)).toEqual(
          builds.map((b: Build) => b.id),
        );
        expect(res.body.pageInfo.total).toBe(3);
        expect(res.body.pageInfo.page).toBe(1);
        expect(res.body.pageInfo.perPage).toBe(30);
        expect(res.body.results[0]).toMatchObject({
          head: {
            sha: expect.any(String),
            branch: expect.any(String),
          },
          base: null,
        });
      });
  });

  describe('with "page" and "perPage" params', () => {
    it("returns limited number of builds", async ({ builds }) => {
      await request(app)
        .get("/project/builds?perPage=1&page=2")
        .set("Authorization", "Bearer the-awesome-token")
        .expect(200)
        .expect((res) => {
          expect(res.body.results).toHaveLength(1);
          invariant(builds[1]);
          expect(res.body.results[0].id).toBe(builds[1].id);
        });
    });
  });

  describe('with "headSha" params', () => {
    it("filters builds by the serialized head SHA", async ({
      compareBucketFilter,
    }) => {
      await request(app)
        .get(`/project/builds?headSha=${compareBucketFilter.sha}`)
        .set("Authorization", "Bearer the-awesome-token")
        .expect(200)
        .expect((res) => {
          expect(res.body.results).toHaveLength(1);
          expect(res.body.results.map((b: Build) => b.id)).toEqual([
            compareBucketFilter.withoutCompareScreenshotBucket.id,
          ]);
          expect(res.body.results[0]).toMatchObject({
            head: {
              sha: compareBucketFilter.sha,
              branch: compareBucketFilter.prHeadBranch,
            },
            base: null,
          });
        });
    });
  });

  describe('with "head" params', () => {
    it("filters builds by `compareScreenshotBucket.branch`", async ({
      compareBucketFilter,
    }) => {
      await request(app)
        .get(
          `/project/builds?head=${encodeURIComponent(compareBucketFilter.branch)}`,
        )
        .set("Authorization", "Bearer the-awesome-token")
        .expect(200)
        .expect((res) => {
          expect(res.body.results).toHaveLength(1);
          expect(res.body.results[0]).toMatchObject({
            head: {
              sha: compareBucketFilter.prHeadCommit,
              branch: compareBucketFilter.branch,
            },
            base: null,
          });
        });
    });
  });

  describe('with "distinctName" params', () => {
    it("returns only the latest builds by `builds.name`", async ({
      compareBucketFilter,
    }) => {
      await request(app)
        .get(
          `/project/builds?headSha=${compareBucketFilter.sha}&distinctName=true`,
        )
        .set("Authorization", "Bearer the-awesome-token")
        .expect(200)
        .expect((res) => {
          expect(res.body.results).toHaveLength(1);
          expect(res.body.results[0]).toMatchObject({
            head: {
              sha: compareBucketFilter.sha,
              branch: compareBucketFilter.prHeadBranch,
            },
            base: null,
          });
        });
    });
  });

  it("returns project builds using a user access token on explicit project route", async ({
    factory,
  }) => {
    const [user, account] = await Promise.all([
      factory.User.create(),
      factory.TeamAccount.create({ slug: "acme" }),
    ]);
    const [project] = await Promise.all([
      factory.Project.create({
        accountId: account.id,
        name: "web",
      }),
      factory.UserAccount.create({ userId: user.id }),
      factory.TeamUser.create({
        teamId: account.teamId,
        userId: user.id,
        userLevel: "member",
      }),
    ]);
    await factory.Build.createMany(2, {
      projectId: project.id,
      name: "default",
    });

    const token = UserAccessToken.generateToken();
    const userAccessToken = await factory.UserAccessToken.create({
      userId: user.id,
      token: hashToken(token),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: account.id,
    });

    await request(app)
      .get("/projects/acme/web/builds")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.results).toHaveLength(2);
      });
  });
});
