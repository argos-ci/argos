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

    function getAliases(input: {
      projectDomains: ProjectDomain[];
      customDomainsEnabled?: boolean;
    }) {
      return getDeploymentAliases({
        accountSlug: "argos",
        projectName: "docs",
        deployment,
        projectDomains: input.projectDomains,
        ...(input.customDomainsEnabled === undefined
          ? {}
          : { customDomainsEnabled: input.customDomainsEnabled }),
      }).map((alias) => alias.alias);
    }

    it("serves an active custom domain when the plan includes it", () => {
      expect(
        getAliases({
          projectDomains: [internalDomain, customDomain],
          customDomainsEnabled: true,
        }),
      ).toEqual([
        "docs-main-argos",
        "docs.dev.argos-ci.live",
        "docs.example.com",
      ]);
    });

    it("drops custom domains when the plan does not include them", () => {
      expect(
        getAliases({
          projectDomains: [internalDomain, customDomain],
          customDomainsEnabled: false,
        }),
      ).toEqual(["docs-main-argos", "docs.dev.argos-ci.live"]);
    });

    it("drops custom domains by default", () => {
      expect(getAliases({ projectDomains: [customDomain] })).toEqual([
        "docs-main-argos",
      ]);
    });

    it("drops a custom domain that is not active yet", () => {
      expect(
        getAliases({
          projectDomains: [
            { ...customDomain, status: "pending" } as ProjectDomain,
          ],
          customDomainsEnabled: true,
        }),
      ).toEqual(["docs-main-argos"]);
    });

    it("keeps serving internal domains regardless of the plan", () => {
      expect(
        getAliases({
          projectDomains: [internalDomain],
          customDomainsEnabled: false,
        }),
      ).toEqual(["docs-main-argos", "docs.dev.argos-ci.live"]);
    });
  });
});
