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

  describe("custom domains", () => {
    const deployment = {
      slug: "deployment-1",
      branch: "main",
      environment: "production",
    } as Deployment;

    const internalDomain = {
      domain: "docs.dev.argos-ci.live",
      environment: "production",
      internal: true,
      status: "active",
    } as ProjectDomain;

    const customDomain = {
      domain: "docs.example.com",
      environment: "production",
      internal: false,
      status: "active",
    } as ProjectDomain;

    function getAliases(projectDomains: ProjectDomain[]) {
      return getDeploymentAliases({
        accountSlug: "argos",
        projectName: "docs",
        deployment,
        projectDomains,
      }).map((alias) => alias.alias);
    }

    it("serves an active custom domain alongside the internal one", () => {
      expect(getAliases([internalDomain, customDomain])).toEqual([
        "docs-main-argos",
        "docs.dev.argos-ci.live",
        "docs.example.com",
      ]);
    });

    // Only `active` means CloudFront has verified the domain and is routing it;
    // aliasing a pending one would resolve to a deployment nothing serves.
    it.each(["pending", "failed"] as const)(
      "drops a custom domain that is %s",
      (status) => {
        expect(
          getAliases([{ ...customDomain, status } as ProjectDomain]),
        ).toEqual(["docs-main-argos"]);
      },
    );

    it("serves internal domains whatever their plan", () => {
      expect(getAliases([internalDomain])).toEqual([
        "docs-main-argos",
        "docs.dev.argos-ci.live",
      ]);
    });
  });
});
