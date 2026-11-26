import { test as base, describe, expect } from "vitest";

import {
  Build,
  Deployment,
  DeploymentNotification,
  type Project,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { inferDeployment } from "./inferDeployment";
import { performBuild } from "./job";

const commit = "a".repeat(40);
const prHeadCommit = "b".repeat(40);
const previewUrl = "https://web-git-feature-login.vercel.app";

const test = base.extend<{
  project: Project;
  createBuild: (input?: {
    branch?: string;
    authSource?: Build["authSource"];
    mode?: Build["mode"];
    prHeadCommit?: string;
    urls?: (string | null)[];
  }) => Promise<Build>;
}>({
  project: async ({}, use) => {
    await setupDatabase();
    const account = await factory.TeamAccount.create();
    const project = await factory.Project.create({
      accountId: account.id,
      githubRepositoryId: null,
      deploymentProdBranchGlob: "main",
    });
    await use(project);
  },
  createBuild: async ({ project }, use) => {
    await use(async (input = {}) => {
      const bucket = await factory.ScreenshotBucket.create({
        projectId: project.id,
        commit,
        branch: input.branch ?? "feature/login",
      });
      const build = await factory.Build.create({
        projectId: project.id,
        compareScreenshotBucketId: bucket.id,
        baseScreenshotBucketId: null,
        jobStatus: "progress",
        conclusion: null,
        authSource:
          input.authSource === undefined ? "project-token" : input.authSource,
        mode: input.mode ?? "ci",
        prHeadCommit: input.prHeadCommit ?? null,
      });
      const urls = input.urls ?? [
        `${previewUrl}/`,
        `${previewUrl}/login`,
        `${previewUrl}/settings?tab=profile`,
      ];
      const file = await factory.File.create({ type: "screenshot" });
      await factory.Screenshot.createMany(
        urls.length,
        urls.map((url) => ({
          screenshotBucketId: bucket.id,
          fileId: file.id,
          metadata: {
            url,
            automationLibrary: { name: "@playwright/test", version: "1.57.0" },
            sdk: { name: "@argos-ci/playwright", version: "6.3.0" },
          },
        })),
      );
      return build;
    });
  },
});

function repeat<T>(value: T, count: number): T[] {
  return Array.from({ length: count }, () => value);
}

describe("inferDeployment", () => {
  test("records the deployment a build ran against", async ({
    project,
    createBuild,
  }) => {
    const build = await createBuild();

    await performBuild(build);

    const deployments = await Deployment.query().where("projectId", project.id);
    expect(deployments).toMatchObject([
      {
        status: "ready",
        environment: "preview",
        branch: "feature/login",
        commitSha: commit,
        slug: null,
        externalUrl: `${previewUrl}/`,
        authSource: "project-token",
      },
    ]);
    await expect(
      DeploymentNotification.query().whereIn(
        "deploymentId",
        deployments.map((deployment) => deployment.id),
      ),
    ).resolves.toMatchObject([{ type: "success" }]);
  });

  test("ignores the few pages the tests leave the app for", async ({
    project,
    createBuild,
  }) => {
    const build = await createBuild({
      urls: [
        ...repeat(`${previewUrl}/checkout`, 8),
        "https://accounts.google.com/o/oauth2/v2/auth?client_id=x",
        null,
        null,
        null,
      ],
    });

    const deployment = await inferDeployment({
      build,
      project: await project.$fetchGraph("account"),
    });

    expect(deployment).toMatchObject({ externalUrl: `${previewUrl}/` });
  });

  test("records production from the production branch", async ({
    project,
    createBuild,
  }) => {
    const build = await createBuild({
      branch: "main",
      urls: ["https://WWW.example.com:443/pricing"],
    });

    const deployment = await inferDeployment({
      build,
      project: await project.$fetchGraph("account"),
    });

    expect(deployment).toMatchObject({
      environment: "production",
      externalUrl: "https://www.example.com/",
    });
  });

  test("records one deployment when builds of a commit finish together", async ({
    project,
    createBuild,
  }) => {
    const projectWithAccount = await project.$fetchGraph("account");
    const builds = await Promise.all([createBuild(), createBuild()]);

    await Promise.all(
      builds.map((build) =>
        inferDeployment({ build, project: projectWithAccount }),
      ),
    );

    await expect(
      Deployment.query().where("projectId", project.id).resultSize(),
    ).resolves.toBe(1);
  });

  describe("records nothing", () => {
    test.for([
      "http://localhost:3000/login",
      "http://127.0.0.1:6006/iframe.html?id=button--primary",
      "http://[::1]:3000/",
      "http://my-mac.local:3000/",
      "http://web.localhost:5173/",
      "https://web.internal/",
      "file:///home/runner/work/web/storybook-static/iframe.html",
    ])("for a local origin: %s", async (url, { project, createBuild }) => {
      const build = await createBuild({ urls: repeat(url, 3) });

      await expect(
        inferDeployment({
          build,
          project: await project.$fetchGraph("account"),
        }),
      ).resolves.toBeNull();
    });

    test("when no origin covers most screenshots", async ({
      project,
      createBuild,
    }) => {
      const build = await createBuild({
        urls: [
          ...repeat(`${previewUrl}/`, 6),
          ...repeat("https://docs-git-feature-login.vercel.app/", 4),
        ],
      });

      await expect(
        inferDeployment({
          build,
          project: await project.$fetchGraph("account"),
        }),
      ).resolves.toBeNull();
    });

    test("when a deployment was reported for the commit", async ({
      project,
      createBuild,
    }) => {
      await factory.Deployment.create({
        projectId: project.id,
        commitSha: prHeadCommit,
        externalUrl: "https://web-reported.vercel.app/",
        slug: null,
      });
      const build = await createBuild({ prHeadCommit });

      await expect(
        inferDeployment({
          build,
          project: await project.$fetchGraph("account"),
        }),
      ).resolves.toBeNull();
    });

    test("for a tokenless build", async ({ project, createBuild }) => {
      const build = await createBuild({
        authSource: "github-actions-tokenless",
      });

      await expect(
        inferDeployment({
          build,
          project: await project.$fetchGraph("account"),
        }),
      ).resolves.toBeNull();
    });

    test("for a build that predates its recorded credential", async ({
      project,
      createBuild,
    }) => {
      const build = await createBuild({ authSource: null });

      await expect(
        inferDeployment({
          build,
          project: await project.$fetchGraph("account"),
        }),
      ).resolves.toBeNull();
    });

    test("for a monitoring build", async ({ project, createBuild }) => {
      const build = await createBuild({ mode: "monitoring" });

      await expect(
        inferDeployment({
          build,
          project: await project.$fetchGraph("account"),
        }),
      ).resolves.toBeNull();
    });

    test("for the production site on a feature branch", async ({
      project,
      createBuild,
    }) => {
      await factory.Deployment.create({
        projectId: project.id,
        environment: "production",
        branch: "main",
        externalUrl: "https://www.example.com/",
        slug: null,
      });
      const build = await createBuild({
        urls: repeat("https://www.example.com/pricing", 3),
      });

      await expect(
        inferDeployment({
          build,
          project: await project.$fetchGraph("account"),
        }),
      ).resolves.toBeNull();
    });

    test("for the production custom domain on a feature branch", async ({
      project,
      createBuild,
    }) => {
      const production = await factory.Deployment.create({
        projectId: project.id,
        environment: "production",
        branch: "main",
      });
      await factory.DeploymentAlias.create({
        deploymentId: production.id,
        type: "domain",
        alias: "www.example.com",
      });
      const build = await createBuild({
        urls: repeat("https://www.example.com/pricing", 3),
      });

      await expect(
        inferDeployment({
          build,
          project: await project.$fetchGraph("account"),
        }),
      ).resolves.toBeNull();
    });
  });
});
