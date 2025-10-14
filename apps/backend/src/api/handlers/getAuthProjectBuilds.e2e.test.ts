import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import z from "zod";

import type { Build, Project } from "@/database/models/index.js";
import { factory, setupDatabase } from "@/database/testing/index.js";

import { createTestHandlerApp } from "../test-util";
import { getAuthProjectBuilds } from "./getAuthProjectBuilds";

const app = createTestHandlerApp(getAuthProjectBuilds);

describe("getAuthProjectBuilds", () => {
  let project: Project;
  let builds: Build[];

  beforeAll(() => {
    z.globalRegistry.clear();
  });

  beforeEach(async () => {
    await setupDatabase();
    project = await factory.Project.create({
      token: "the-awesome-token",
    });
    builds = await factory.Build.createMany(3, {
      projectId: project.id,
      name: "default",
    });
    // Sort builds by id desc
    builds.sort((a: Build, b: Build) => b.id.localeCompare(a.id));
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

  it("returns a list of project builds sorted by id desc", async () => {
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
    it("returns limited number of builds", async () => {
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
    it("filters builds by `compareScreenshotBucket.commit` or `builds.prHeadCommit`", async () => {
      const commit = "a0a6e27051024a628a3b8e632874f5afc08c5c2d";
      const [withPrHeadCommit, withCompareScreenshotBucket] = builds;
      invariant(withPrHeadCommit && withCompareScreenshotBucket);
      await withPrHeadCommit.$query().patch({ prHeadCommit: commit });

      const headArtifactBucket = await factory.ArtifactBucket.create({
        projectId: project.id,
        name: withCompareScreenshotBucket.name,
        commit,
      });
      await withCompareScreenshotBucket.$query().patch({
        headArtifactBucketId: headArtifactBucket.id,
      });
      await request(app)
        .get(`/project/builds?commit=${commit}`)
        .set("Authorization", "Bearer the-awesome-token")
        .expect(200)
        .expect((res) => {
          expect(res.body.results).toHaveLength(2);
          expect(res.body.results.map((b: Build) => b.id)).toEqual([
            withPrHeadCommit.id,
            withCompareScreenshotBucket.id,
          ]);
        });
    });
  });

  describe('with "distinctName" params', () => {
    it("returns only the latest builds by `builds.name`", async () => {
      const commit = "a0a6e27051024a628a3b8e632874f5afc08c5c2d";
      // Sort by id desc to ensure the latest builds are first
      const [withPrHeadCommit, withCompareScreenshotBucket] = builds.sort(
        (a: Build, b: Build) => a.id.localeCompare(b.id),
      );
      invariant(withPrHeadCommit && withCompareScreenshotBucket);
      await withPrHeadCommit.$query().patch({ prHeadCommit: commit });

      const headArtifactBucket = await factory.ArtifactBucket.create({
        projectId: project.id,
        name: withCompareScreenshotBucket.name,
        commit,
      });
      await withCompareScreenshotBucket.$query().patch({
        headArtifactBucketId: headArtifactBucket.id,
      });
      await request(app)
        .get(`/project/builds?commit=${commit}&distinctName=true`)
        .set("Authorization", "Bearer the-awesome-token")
        .expect(200)
        .expect((res) => {
          expect(res.body.results).toHaveLength(1);
          expect(res.body.results.map((b: Build) => b.id)).toEqual([
            withCompareScreenshotBucket.id,
          ]);
        });
    });
  });
});
