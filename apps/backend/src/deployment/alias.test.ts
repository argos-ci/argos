import { describe, expect, it } from "vitest";

import type { Deployment } from "@/database/models";

import {
  findInternalDeploymentAlias,
  getDeploymentAliases,
  isInternalDeploymentAlias,
} from "./alias";

describe("deployment aliases", () => {
  it('detects the reserved internal alias "dev"', () => {
    expect(isInternalDeploymentAlias("dev")).toBe(true);
    expect(isInternalDeploymentAlias("DEV")).toBe(true);
    expect(isInternalDeploymentAlias("preview")).toBe(false);
  });

  it("finds a reserved alias in the generated aliases", () => {
    const deployment = {
      slug: "dev",
      branch: "main",
    } as Deployment;

    const aliases = getDeploymentAliases({
      accountSlug: "argos",
      projectName: "docs",
      deployment,
    });

    expect(findInternalDeploymentAlias(aliases)).toEqual({
      type: "slug",
      alias: "dev",
    });
  });
});
