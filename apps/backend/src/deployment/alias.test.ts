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

  it("finds a reserved alias in a list of aliases", () => {
    expect(
      findInternalDeploymentAlias([
        {
          type: "branch",
          alias: "preview",
        },
        {
          type: "domain",
          alias: "dev",
        },
      ]),
    ).toEqual({
      type: "domain",
      alias: "dev",
    });
  });

  it("generates only the branch alias for a deployment", () => {
    const deployment = {
      slug: "deployment-1",
      branch: "main",
    } as Deployment;

    expect(
      getDeploymentAliases({
        accountSlug: "argos",
        projectName: "docs",
        deployment,
      }),
    ).toEqual([
      {
        type: "branch",
        alias: "docs-main-argos",
      },
    ]);
  });
});
