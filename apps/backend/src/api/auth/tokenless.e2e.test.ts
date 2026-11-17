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
import { Media } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { setupRedis } from "@/util/redis/testing";

import { exchangeGitHubActionsTokenlessToken } from "../handlers/exchangeGitHubActionsTokenlessToken";
import { getProject } from "../handlers/getProject";
import { listBuilds } from "../handlers/listBuilds";
import {
  deleteMediaHandler,
  getMediaHandler,
  listMediaHandler,
  updateMediaHandler,
} from "../handlers/media";
import { createTestHandlerApp } from "../test-util";

const app = createTestHandlerApp(
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
});
