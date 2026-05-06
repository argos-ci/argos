import { describe, expect, it } from "vitest";

import type { Deployment, ProjectDomain } from "@/database/models";

import { getDeploymentAliases } from "./alias";

describe("deployment aliases", () => {
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

  it("generates the production domain aliases with the domain type", () => {
    const deployment = {
      slug: "deployment-1",
      branch: "main",
      environment: "production",
    } as Deployment;

    expect(
      getDeploymentAliases({
        accountSlug: "argos",
        projectName: "docs",
        deployment,
        projectDomains: [
          {
            domain: "docs.dev.argos-ci.live",
            environment: "production",
            internal: true,
          } as ProjectDomain,
        ],
      }),
    ).toEqual([
      {
        type: "branch",
        alias: "docs-main-argos",
      },
      {
        type: "domain",
        alias: "docs.dev.argos-ci.live",
      },
    ]);
  });
});
