import { invariant } from "@argos/util/invariant";
import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it } from "vitest";

import config from "@/config";

import { signDeploymentAccessToken } from "./deployment-access";

describe("signDeploymentAccessToken", () => {
  const originalSecret = config.get("deployments.accessTokenSecret");

  afterEach(() => {
    config.set("deployments.accessTokenSecret", originalSecret);
  });

  it("signs a short-lived HS256 token for the deployment viewer", () => {
    config.set("deployments.accessTokenSecret", "deployment-access-secret");

    const token = signDeploymentAccessToken({
      projectId: "project-1",
      sub: "user-1",
    });

    const header = jwt.decode(token, { complete: true });
    invariant(header && typeof header === "object", "JWT header is missing");
    expect(header.header.alg).toBe("HS256");

    const payload = jwt.verify(token, "deployment-access-secret", {
      algorithms: ["HS256"],
    });
    invariant(typeof payload === "object", "JWT payload is missing");

    expect(payload).toMatchObject({
      projectId: "project-1",
      sub: "user-1",
    });
    invariant(typeof payload.exp === "number", "JWT exp is missing");
    invariant(typeof payload.iat === "number", "JWT iat is missing");
    expect(payload.exp - payload.iat).toBe(60 * 60);
  });

  it("throws when the deployment access secret is not configured", () => {
    config.set("deployments.accessTokenSecret", "");

    expect(() =>
      signDeploymentAccessToken({
        projectId: "project-1",
        sub: "user-1",
      }),
    ).toThrow("deployments.accessTokenSecret is not configured");
  });
});
