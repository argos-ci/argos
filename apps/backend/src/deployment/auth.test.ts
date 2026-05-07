import { describe, expect, it } from "vitest";

import type { DeploymentAuth } from "@/database/models/Project";

import { getDeploymentVisibility } from "./auth";

const project = (deploymentAuth: DeploymentAuth) => ({ deploymentAuth });

describe("getDeploymentVisibility", () => {
  it("makes every deployment public when project deployment auth is public", () => {
    expect(
      getDeploymentVisibility({
        deployment: { environment: "preview", type: "branch" },
        project: project("public"),
      }),
    ).toBe("public");
  });

  it("makes every deployment private when project deployment auth is private", () => {
    expect(
      getDeploymentVisibility({
        deployment: { environment: "production", type: "domain" },
        project: project("private"),
      }),
    ).toBe("private");
  });

  it("keeps production custom domains public with standard protection", () => {
    expect(
      getDeploymentVisibility({
        deployment: { environment: "production", type: "domain" },
        project: project("domain-private"),
      }),
    ).toBe("public");
  });

  it("protects non-production custom domains with standard protection", () => {
    expect(
      getDeploymentVisibility({
        deployment: { environment: "preview", type: "domain" },
        project: project("domain-private"),
      }),
    ).toBe("private");
  });

  it("protects production deployment slugs with standard protection", () => {
    expect(
      getDeploymentVisibility({
        deployment: { environment: "production", type: "slug" },
        project: project("domain-private"),
      }),
    ).toBe("private");
  });
});
