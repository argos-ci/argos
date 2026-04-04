import { test as base, beforeEach, describe, expect, vi } from "vitest";

import type { Project as ProjectModel } from "@/database/models";
import { Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getAuthProjectPayloadFromBearerToken } from "./project";
import { tokenlessGitHubActionsStrategy } from "./tokenless/github-actions";

const test = base.extend<{
  factory: typeof factory;
  project: ProjectModel;
}>({
  factory: async ({}, use) => {
    await setupDatabase();
    await use(factory);
  },
  project: async ({ factory }, use) => {
    const project = await factory.Project.create({
      token: "project-token",
    });
    await use(project);
  },
});

describe("getAuthProjectPayloadFromBearerToken", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("rejects user access tokens", async () => {
    const querySpy = vi.spyOn(Project, "query");

    await expect(
      getAuthProjectPayloadFromBearerToken(
        "arp_123456789012345678901234567890123456",
      ),
    ).rejects.toMatchObject({
      statusCode: 401,
      message:
        "This endpoint is not accessible with a user access token, only with a an Argos project token.",
    });

    expect(querySpy).not.toHaveBeenCalled();
  });

  test("returns the auth payload for a matching project token", async ({
    project,
  }) => {
    const payload = await getAuthProjectPayloadFromBearerToken("project-token");

    expect(payload).toMatchObject({
      type: "project",
      project: {
        id: project.id,
        token: "project-token",
      },
    });
  });

  test("returns the auth payload for a matching tokenless strategy", async ({
    project,
  }) => {
    const getProject = vi
      .spyOn(tokenlessGitHubActionsStrategy, "getProject")
      .mockResolvedValue(project);
    const querySpy = vi.spyOn(Project, "query");

    vi.spyOn(tokenlessGitHubActionsStrategy, "detect").mockReturnValue(true);

    await expect(
      getAuthProjectPayloadFromBearerToken("tokenless-bearer"),
    ).resolves.toMatchObject({
      type: "project",
      project: {
        id: project.id,
      },
    });

    expect(getProject).toHaveBeenCalledWith("tokenless-bearer");
    expect(querySpy).not.toHaveBeenCalled();
  });

  test("throws a tokenless-specific error when the strategy cannot resolve a project", async () => {
    vi.spyOn(tokenlessGitHubActionsStrategy, "detect").mockReturnValue(true);
    vi.spyOn(tokenlessGitHubActionsStrategy, "getProject").mockResolvedValue(
      null,
    );

    await expect(
      getAuthProjectPayloadFromBearerToken("tokenless-bearer"),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: `Project not found. Ensure a project exists in Argos (https://app.argos-ci.com) and restart your test after setup. Persisting issue? Consider adding 'ARGOS_TOKEN' to your CI environment variables. (token: "tokenless-bearer").`,
    });
  });

  test("throws when no project matches a standard project token", async ({
    factory,
  }) => {
    void factory;

    await expect(
      getAuthProjectPayloadFromBearerToken("invalid-project-token"),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: `Project not found in Argos. If the issue persists, verify your token. (token: "invalid-project-token").`,
    });
  });
});
