import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import z from "zod";

import { UserAccessToken, UserAccessTokenScope } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { getBuild } from "./getBuild";

const app = createTestHandlerApp(getBuild);

describe("getBuild", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  beforeEach(async () => {
    await setupDatabase();
  });

  describe("without a valid token", () => {
    it("returns 401 status code", async () => {
      await request(app)
        .get("/builds/non-existing-id")
        .set("Authorization", "Bearer invalid-token")
        .expect((res) => {
          expect(res.body.error).toBe(
            `Project not found in Argos. If the issue persists, verify your token. (token: "invalid-token").`,
          );
        })
        .expect(401);
    });
  });

  describe("with a build from another project", () => {
    it("returns 404 status code", async () => {
      await factory.Project.create({ token: "valid-token" });
      const otherProject = await factory.Project.create();
      const compareScreenshotBucket = await factory.ScreenshotBucket.create({
        projectId: otherProject.id,
      });
      const foreignBuild = await factory.Build.create({
        projectId: otherProject.id,
        compareScreenshotBucketId: compareScreenshotBucket.id,
      });

      await request(app)
        .get(`/builds/${foreignBuild.id}`)
        .set("Authorization", "Bearer valid-token")
        .expect((res) => {
          expect(res.body.error).toBe("Not found");
        })
        .expect(404);
    });
  });

  describe("with a valid build", () => {
    it("returns the build", async () => {
      const account = await factory.TeamAccount.create({
        slug: "awesome-team",
      });
      const project = await factory.Project.create({
        accountId: account.id,
        name: "awesome-project",
        token: "the-awesome-token",
      });
      const [compareScreenshotBucket, baseScreenshotBucket] =
        await factory.ScreenshotBucket.createMany(2, [
          { projectId: project.id },
          {
            projectId: project.id,
            branch: "develop",
            commit: "7c96c8120dc539201c9ef3e2db8a1671585ac69e",
          },
        ]);
      invariant(compareScreenshotBucket);
      invariant(baseScreenshotBucket);

      const build = await factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: compareScreenshotBucket.id,
        baseScreenshotBucketId: baseScreenshotBucket.id,
        prHeadCommit: "91d4f24b71c2ef18fb8a5f5f4d2e9d3dcb1a4d6a",
        metadata: null,
      });

      const res = await request(app)
        .get(`/builds/${build.id}`)
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
        stats: {
          total: 0,
          failure: 0,
          changed: 0,
          added: 0,
          removed: 0,
          unchanged: 0,
          retryFailure: 0,
          ignored: 0,
        },
        metadata: null,
        url,
        notification: {
          description: "Everything's good!",
          context: "argos",
          github: { state: "success" },
          gitlab: { state: "success" },
        },
      });
    });

    it("returns a build with a user access token", async () => {
      const [user, account] = await Promise.all([
        factory.User.create(),
        factory.TeamAccount.create(),
      ]);
      const [project] = await Promise.all([
        factory.Project.create({ accountId: account.id }),
        factory.UserAccount.create({ userId: user.id }),
        factory.TeamUser.create({
          teamId: account.teamId,
          userId: user.id,
          userLevel: "member",
        }),
      ]);
      const build = await factory.Build.create({
        projectId: project.id,
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
        .get(`/builds/${build.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(build.id);
        });
    });
  });

  describe("with screenshot diffs containing a change", () => {
    it("returns a build with changes-detected status and stats", async () => {
      const account = await factory.TeamAccount.create({
        slug: "diffs-team",
      });
      const project = await factory.Project.create({
        accountId: account.id,
        name: "diffs-project",
        token: "token-with-diffs",
      });
      const [baseScreenshotBucket, compareScreenshotBucket] =
        await factory.ScreenshotBucket.createMany(2, [
          { projectId: project.id, name: "base" },
          { projectId: project.id, name: "compare" },
        ]);
      invariant(baseScreenshotBucket);
      invariant(compareScreenshotBucket);
      const build = await factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: compareScreenshotBucket.id,
        prHeadCommit: "91d4f24b71c2ef18fb8a5f5f4d2e9d3dcb1a4d6a",
        conclusion: "changes-detected",
        stats: {
          total: 1,
          changed: 1,
          added: 0,
          removed: 0,
          failure: 0,
          unchanged: 0,
          retryFailure: 0,
          ignored: 0,
        },
      });

      const [baseScreenshot, compareScreenshot] =
        await factory.Screenshot.createMany(2, [
          {
            screenshotBucketId: baseScreenshotBucket.id,
            name: "home.png",
          },
          {
            screenshotBucketId: compareScreenshotBucket.id,
            name: "home.png",
            baseName: "home.png",
          },
        ]);
      invariant(baseScreenshot);
      invariant(compareScreenshot);

      await factory.ScreenshotDiff.create({
        buildId: build.id,
        baseScreenshotId: baseScreenshot.id,
        compareScreenshotId: compareScreenshot.id,
        score: 0.42,
      });

      const res = await request(app)
        .get(`/builds/${build.id}`)
        .set("Authorization", "Bearer token-with-diffs")
        .expect(200);
      const url = await build.getUrl();
      expect(res.body).toMatchObject({
        id: build.id,
        head: {
          sha: build.prHeadCommit,
          branch: compareScreenshotBucket.branch,
        },
        base: null,
        status: "changes-detected",
        conclusion: "changes-detected",
        stats: {
          total: 1,
          changed: 1,
          added: 0,
          removed: 0,
          failure: 0,
          unchanged: 0,
          retryFailure: 0,
          ignored: 0,
        },
        url,
        notification: {
          description: "1 changed — waiting for your decision",
          context: "argos",
          github: { state: "failure" },
          gitlab: { state: "failed" },
        },
      });
    });
  });
});
