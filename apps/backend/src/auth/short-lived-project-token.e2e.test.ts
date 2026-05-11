import { test as base, describe, expect } from "vitest";

import type { Project as ProjectModel } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { setupRedis } from "@/util/redis/testing";

import {
  createShortLivedProjectToken,
  getProjectFromShortLivedProjectToken,
  isShortLivedProjectToken,
} from "./short-lived-project-token";

const test = base.extend<{
  project: ProjectModel;
}>({
  project: async ({}, use) => {
    await setupDatabase();
    const project = await factory.Project.create({
      githubActionsOidcEnabled: true,
    });
    await use(project);
  },
});

setupRedis();

describe("short-lived project token", () => {
  test("creates a temporary token and resolves its project", async ({
    project,
  }) => {
    const result = await createShortLivedProjectToken({
      projectId: project.id,
      source: "github-actions-oidc",
    });

    expect(result.token).toMatch(/^argos_tmp_/);
    expect(isShortLivedProjectToken(result.token)).toBe(true);
    expect(Date.parse(result.expiresAt)).toBeGreaterThan(Date.now());

    const resolvedProject = await getProjectFromShortLivedProjectToken(
      result.token,
    );
    expect(resolvedProject?.id).toBe(project.id);
  });

  test("returns null for a non-temporary token", async ({ project }) => {
    void project;

    await expect(
      getProjectFromShortLivedProjectToken("argos_not-temporary"),
    ).resolves.toBeNull();
  });

  test("returns null when OIDC is disabled after token creation", async ({
    project,
  }) => {
    const { token } = await createShortLivedProjectToken({
      projectId: project.id,
      source: "github-actions-oidc",
    });

    await project.$query().patch({
      githubActionsOidcEnabled: false,
    });

    await expect(
      getProjectFromShortLivedProjectToken(token),
    ).resolves.toBeNull();
  });

  test("resolves a project for a tokenless-sourced token", async ({
    project,
  }) => {
    await project.$query().patch({
      tokenlessAuthEnabled: true,
    });

    const { token } = await createShortLivedProjectToken({
      projectId: project.id,
      source: "github-actions-tokenless",
    });

    const resolvedProject = await getProjectFromShortLivedProjectToken(token);
    expect(resolvedProject?.id).toBe(project.id);
  });

  test("returns null when tokenless auth is disabled after token creation", async ({
    project,
  }) => {
    await project.$query().patch({
      tokenlessAuthEnabled: true,
    });

    const { token } = await createShortLivedProjectToken({
      projectId: project.id,
      source: "github-actions-tokenless",
    });

    await project.$query().patch({
      tokenlessAuthEnabled: false,
    });

    await expect(
      getProjectFromShortLivedProjectToken(token),
    ).resolves.toBeNull();
  });
});
