import express from "express";
import request from "supertest";
import { afterAll, test as base, describe, expect, vi } from "vitest";

import type { Account, GithubInstallation } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { getAppOctokit } from "@/github/client";
import { quitAmqp } from "@/job-core";

import { apiMiddleware } from "./github";

vi.mock("@/github/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/github/client")>()),
  getAppOctokit: vi.fn(),
}));

afterAll(async () => {
  await quitAmqp();
});

const app = express().use(apiMiddleware);

/**
 * Tell the installation GitHub reports for any id.
 */
function mockGitHubInstallation(input: { createdAt: Date }) {
  vi.mocked(getAppOctokit).mockReturnValue({
    apps: {
      getInstallation: vi.fn().mockResolvedValue({
        data: { created_at: input.createdAt.toISOString() },
      }),
    },
  } as any);
}

/**
 * Visit the setup URL, as GitHub sends the user there after an installation.
 */
function visitSetupUrl(input: { installationId: number; account: Account }) {
  return request(app)
    .get("/github-light/install")
    .query({
      installation_id: input.installationId,
      setup_action: "install",
      state: JSON.stringify({ accountId: input.account.id }),
    });
}

async function getLinkedInstallationId(account: Account) {
  const { githubLightInstallationId } = await account
    .$query()
    .select("githubLightInstallationId");
  return githubLightInstallationId;
}

const test = base.extend<{
  fixture: {
    teamAccount: Account;
    installation: GithubInstallation;
  };
}>({
  fixture: async ({}, use) => {
    await setupDatabase();
    const [teamAccount, installation] = await Promise.all([
      factory.TeamAccount.create(),
      factory.GithubInstallation.create({ app: "light" }),
    ]);
    await use({ teamAccount, installation });
  },
});

describe("GET /github-light/install", () => {
  test("links the installation GitHub just created", async ({ fixture }) => {
    mockGitHubInstallation({ createdAt: new Date() });
    const res = await visitSetupUrl({
      installationId: fixture.installation.githubId,
      account: fixture.teamAccount,
    });
    expect(res.status).toBe(302);
    expect(await getLinkedInstallationId(fixture.teamAccount)).toBe(
      fixture.installation.id,
    );
  });

  test("does not link an installation another account owns", async ({
    fixture,
  }) => {
    mockGitHubInstallation({ createdAt: new Date() });
    await factory.TeamAccount.create({
      githubLightInstallationId: fixture.installation.id,
    });
    const res = await visitSetupUrl({
      installationId: fixture.installation.githubId,
      account: fixture.teamAccount,
    });
    expect(res.status).toBe(400);
    expect(await getLinkedInstallationId(fixture.teamAccount)).toBeNull();
  });

  test("does not link an installation GitHub created a while ago", async ({
    fixture,
  }) => {
    mockGitHubInstallation({
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    const res = await visitSetupUrl({
      installationId: fixture.installation.githubId,
      account: fixture.teamAccount,
    });
    expect(res.status).toBe(400);
    expect(await getLinkedInstallationId(fixture.teamAccount)).toBeNull();
  });
});
