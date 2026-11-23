import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import { getAuthProjectPayloadFromBearerToken } from "@/auth/project";
import {
  branch,
  commitSha,
  createLinkedProject,
  setupGithubServer,
  stubWorkflowRuns,
  type LinkedProject,
} from "@/auth/tokenless/github-actions.test-util";
import { Build, Media } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { setupRedis } from "@/util/redis/testing";

import { createBuild } from "../handlers/createBuild";
import { exchangeGitHubActionsTokenlessToken } from "../handlers/exchangeGitHubActionsTokenlessToken";
import { finalizeBuilds } from "../handlers/finalizeBuilds";
import { getProject } from "../handlers/getProject";
import { listBuilds } from "../handlers/listBuilds";
import {
  deleteMediaHandler,
  getMediaHandler,
  listMediaHandler,
  updateMediaHandler,
} from "../handlers/media";
import { updateBuild } from "../handlers/updateBuild";
import { createTestHandlerApp } from "../test-util";

const app = createTestHandlerApp(
  createBuild,
  updateBuild,
  finalizeBuilds,
  exchangeGitHubActionsTokenlessToken,
  getProject,
  listBuilds,
  listMediaHandler,
  getMediaHandler,
  updateMediaHandler,
  deleteMediaHandler,
);

const test = base.extend<{
  linkedProject: LinkedProject;
  projectPath: string;
  media: Media;
}>({
  linkedProject: async ({}, use) => {
    await setupDatabase();
    const linkedProject = await createLinkedProject();
    stubWorkflowRuns({ 42: {} });
    await use(linkedProject);
  },
  projectPath: async ({ linkedProject }, use) => {
    const { project } = linkedProject;
    const account = await project.$relatedQuery("account");
    invariant(account, "Project account not found");
    await use(`${account.slug}/${project.name}`);
  },
  media: async ({ linkedProject }, use) => {
    const { media } = await factory.createMediaWithVersion({
      media: {
        projectId: linkedProject.project.id,
        name: "checkout.png",
        branch: "feature",
        visibility: "team",
      },
    });
    await use(media);
  },
});

setupRedis();
setupGithubServer();

describe("tokenless bearers", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  test("hold only the permissions CI uploads need", async ({
    linkedProject,
  }) => {
    const exchanged = await request(app)
      .post("/auth/github-actions/tokenless/exchange")
      .send({ tokenlessToken: linkedProject.bearer, commit: commitSha, branch })
      .expect(200);

    for (const bearer of [linkedProject.bearer, exchanged.body.token]) {
      const auth = await getAuthProjectPayloadFromBearerToken(bearer);
      expect(auth.permissions).toEqual([
        "builds:write",
        "deployments:write",
        "media:write",
      ]);
    }
  });

  test("cannot read the project", async ({
    linkedProject,
    projectPath,
    media,
  }) => {
    for (const path of [
      `/projects/${projectPath}`,
      `/projects/${projectPath}/builds`,
      `/projects/${projectPath}/media`,
      `/media/${media.id}`,
    ]) {
      await request(app)
        .get(path)
        .set("Authorization", `Bearer ${linkedProject.bearer}`)
        .expect(403);
    }
  });

  test("cannot edit a media", async ({ linkedProject, media }) => {
    await request(app)
      .patch(`/media/${media.id}`)
      .set("Authorization", `Bearer ${linkedProject.bearer}`)
      .send({ branch: null })
      .expect(403)
      .expect((res) => {
        expect(res.body.error).toBe(
          "Tokenless authentication cannot edit media. Use a project token or a personal access token.",
        );
      });

    await expect(media.$query()).resolves.toMatchObject({ branch: "feature" });
  });

  test("cannot delete a media", async ({ linkedProject, media }) => {
    await request(app)
      .delete(`/media/${media.id}`)
      .set("Authorization", `Bearer ${linkedProject.bearer}`)
      .expect(403)
      .expect((res) => {
        expect(res.body.error).toBe(
          "Tokenless authentication cannot delete media. Use a project token or a personal access token.",
        );
      });

    await expect(Media.query().findById(media.id)).resolves.toBeTruthy();
  });

  describe("on a pending parallel build", () => {
    async function createPendingBuild(
      linkedProject: LinkedProject,
      authSource: Build["authSource"],
    ) {
      const bucket = await factory.ScreenshotBucket.create({
        projectId: linkedProject.project.id,
        complete: false,
      });
      return factory.Build.create({
        name: "default",
        projectId: linkedProject.project.id,
        compareScreenshotBucketId: bucket.id,
        externalId: "nonce",
        totalBatch: -1,
        authSource,
      });
    }

    test("cannot upload to, join or finalize a build another token created", async ({
      linkedProject,
    }) => {
      const build = await createPendingBuild(linkedProject, "project-token");
      const auth = `Bearer ${linkedProject.bearer}`;

      await request(app)
        .put(`/builds/${build.id}`)
        .set("Authorization", auth)
        .send({ screenshots: [], parallel: true, parallelTotal: -1 })
        .expect(403);
      await request(app)
        .post("/builds")
        .set("Authorization", auth)
        .send({
          commit: commitSha,
          branch,
          screenshots: [],
          parallel: true,
          parallelNonce: "nonce",
        })
        .expect(403);
      await request(app)
        .post("/builds/finalize")
        .set("Authorization", auth)
        .send({ parallelNonce: "nonce" })
        .expect(403);

      await expect(
        build.$relatedQuery("compareScreenshotBucket"),
      ).resolves.toMatchObject({ complete: false });
    });

    test("can finalize a build a tokenless bearer created", async ({
      linkedProject,
    }) => {
      const build = await createPendingBuild(
        linkedProject,
        "github-actions-tokenless",
      );

      await request(app)
        .post("/builds/finalize")
        .set("Authorization", `Bearer ${linkedProject.bearer}`)
        .send({ parallelNonce: "nonce" })
        .expect(200);

      await expect(
        Build.query()
          .findById(build.id)
          .withGraphFetched("compareScreenshotBucket"),
      ).resolves.toMatchObject({ compareScreenshotBucket: { complete: true } });
    });
  });
});
