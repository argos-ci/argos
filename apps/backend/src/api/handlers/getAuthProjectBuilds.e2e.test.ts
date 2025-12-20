import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import type { Build, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { getAuthProjectBuilds } from "./getAuthProjectBuilds";

const app = createTestHandlerApp(getAuthProjectBuilds);

const it = base.extend<{
  project: Project;
  builds: Build[];
  factory: typeof factory;
  commit: {
    sha: string;
    withPrHeadCommit: Build;
    withCompareScreenshotBucket: Build;
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
  commit: async ({ project, builds }, use) => {
    const sha = "a0a6e27051024a628a3b8e632874f5afc08c5c2d";
    const [withPrHeadCommit, withCompareScreenshotBucket] = builds;
    invariant(withPrHeadCommit && withCompareScreenshotBucket);

    await Promise.all([
      withPrHeadCommit.$query().patch({ prHeadCommit: sha }),
      (async () => {
        const compareScreenshotBucket = await factory.ScreenshotBucket.create({
          projectId: project.id,
          name: withCompareScreenshotBucket.name,
          commit: sha,
        });
        await withCompareScreenshotBucket.$query().patch({
          compareScreenshotBucketId: compareScreenshotBucket.id,
        });
      })(),
    ]);
    await use({ sha, withPrHeadCommit, withCompareScreenshotBucket });
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

  describe('with "commit" params', () => {
    it("filters builds by `compareScreenshotBucket.commit` or `builds.prHeadCommit`", async ({
      commit,
    }) => {
      await request(app)
        .get(`/project/builds?commit=${commit.sha}`)
        .set("Authorization", "Bearer the-awesome-token")
        .expect(200)
        .expect((res) => {
          expect(res.body.results).toHaveLength(2);
          expect(res.body.results.map((b: Build) => b.id)).toEqual([
            commit.withPrHeadCommit.id,
            commit.withCompareScreenshotBucket.id,
          ]);
        });
    });
  });

  describe('with "distinctName" params', () => {
    it("returns only the latest builds by `builds.name`", async ({
      commit,
    }) => {
      await request(app)
        .get(`/project/builds?commit=${commit.sha}&distinctName=true`)
        .set("Authorization", "Bearer the-awesome-token")
        .expect(200)
        .expect((res) => {
          expect(res.body.results).toHaveLength(1);
          expect(res.body.results.map((b: Build) => b.id)).toEqual([
            commit.withPrHeadCommit.id,
          ]);
        });
    });
  });
});
