import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import z from "zod";

import { UserAccessToken, UserAccessTokenScope } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { getAuthBuildByNumber } from "./getAuthBuildByNumber";

const app = createTestHandlerApp(getAuthBuildByNumber);

describe("getAuthBuildByNumber", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  beforeEach(async () => {
    await setupDatabase();
  });

  describe("without a valid token", () => {
    it("returns 401 status code", async () => {
      await request(app)
        .get("/project/builds/1")
        .set("Authorization", "Bearer invalid-token")
        .expect((res) => {
          expect(res.body.error).toContain("Project not found in Argos");
        })
        .expect(401);
    });
  });

  describe("with a build from another project", () => {
    it("returns 404 status code", async () => {
      const [, otherProject] = await factory.Project.createMany(2, {
        token: "valid-token",
      });
      invariant(otherProject, "Expected another project to be created");
      const compareScreenshotBucket = await factory.ScreenshotBucket.create({
        projectId: otherProject.id,
      });
      await factory.Build.create({
        projectId: otherProject.id,
        compareScreenshotBucketId: compareScreenshotBucket.id,
        number: 1,
      });

      await request(app)
        .get("/project/builds/1")
        .set("Authorization", "Bearer valid-token")
        .expect((res) => {
          expect(res.body.error).toBe("Not found");
        })
        .expect(404);
    });
  });

  describe("with an unknown build number", () => {
    it("returns 404 status code", async () => {
      await factory.Project.create({ token: "valid-token" });

      await request(app)
        .get("/project/builds/9999999")
        .set("Authorization", "Bearer valid-token")
        .expect((res) => {
          expect(res.body.error).toBe("Not found");
        })
        .expect(404);
    });
  });

  describe("with a valid build number", () => {
    it("returns the build", async () => {
      const account = await factory.TeamAccount.create({
        slug: "awesome-team",
      });
      const project = await factory.Project.create({
        accountId: account.id,
        name: "awesome-project",
        token: "the-awesome-token",
      });
      const [compareScreenshotBucket, baseScreenshotBucket] = await Promise.all(
        [
          factory.ScreenshotBucket.create({
            projectId: project.id,
          }),
          factory.ScreenshotBucket.create({
            projectId: project.id,
            branch: "develop",
            commit: "7c96c8120dc539201c9ef3e2db8a1671585ac69e",
          }),
        ],
      );
      const build = await factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: compareScreenshotBucket.id,
        baseScreenshotBucketId: baseScreenshotBucket.id,
        prHeadCommit: "91d4f24b71c2ef18fb8a5f5f4d2e9d3dcb1a4d6a",
        metadata: null,
      });

      const res = await request(app)
        .get(`/project/builds/${build.number}`)
        .set("Authorization", "Bearer the-awesome-token")
        .expect(200);

      const url = await build.getUrl();
      expect(res.body).toMatchObject({
        id: build.id,
        number: build.number,
        head: {
          sha: build.prHeadCommit,
          branch: compareScreenshotBucket.branch,
        },
        base: {
          branch: "develop",
          sha: "7c96c8120dc539201c9ef3e2db8a1671585ac69e",
        },
        status: "no-changes",
        conclusion: "no-changes",
        url,
      });
    });
  });

  describe("with an invalid build number", () => {
    it("returns 400 for non-numeric value", async () => {
      await factory.Project.create({ token: "valid-token" });

      await request(app)
        .get("/project/builds/not-a-number")
        .set("Authorization", "Bearer valid-token")
        .expect((res) => {
          expect(res.body.error).toBeDefined();
        })
        .expect(400);
    });
  });

  describe("with a user access token on explicit project route", () => {
    it("returns the build", async () => {
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
      const bucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
      });
      const build = await factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: bucket.id,
        number: 4,
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
        .get("/projects/acme/web/builds/4")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(build.id);
        });
    });
  });
});
