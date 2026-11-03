import { generateKeyPairSync } from "node:crypto";
import { invariant } from "@argos/util/invariant";
import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it } from "vitest";

import config from "@/config";

import { signDeploymentAccessToken } from "./deployment-access";

describe("signDeploymentAccessToken", () => {
  const originalPrivateKey = config.get("deployments.accessTokenPrivateKey");
  const originalSecret = config.get("deployments.accessTokenSecret");

  afterEach(() => {
    config.set("deployments.accessTokenPrivateKey", originalPrivateKey);
    config.set("deployments.accessTokenSecret", originalSecret);
  });

  it("signs a short-lived ES256 token the edge can verify", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
    });
    config.set(
      "deployments.accessTokenPrivateKey",
      privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    );
    config.set("deployments.accessTokenSecret", "deployment-access-secret");

    const token = signDeploymentAccessToken({
      projectId: "project-1",
      sub: "user-1",
    });

    const decoded = jwt.decode(token, { complete: true });
    invariant(decoded && typeof decoded === "object", "JWT is missing");
    expect(decoded.header.alg).toBe("ES256");
    // The edge verifies the JWS form, raw r || s, never DER.
    expect(Buffer.from(decoded.signature, "base64url")).toHaveLength(64);

    const payload = jwt.verify(token, publicKey, { algorithms: ["ES256"] });
    invariant(typeof payload === "object", "JWT payload is missing");
    expect(payload).toMatchObject({ projectId: "project-1", sub: "user-1" });
    invariant(typeof payload.exp === "number", "JWT exp is missing");
    invariant(typeof payload.iat === "number", "JWT iat is missing");
    expect(payload.exp - payload.iat).toBe(60 * 60);
  });

  it("falls back to HS256 while no private key is configured", () => {
    config.set("deployments.accessTokenPrivateKey", "");
    config.set("deployments.accessTokenSecret", "deployment-access-secret");

    const token = signDeploymentAccessToken({
      projectId: "project-1",
      sub: "user-1",
    });

    const payload = jwt.verify(token, "deployment-access-secret", {
      algorithms: ["HS256"],
    });
    invariant(typeof payload === "object", "JWT payload is missing");
    expect(payload).toMatchObject({ projectId: "project-1", sub: "user-1" });
  });

  it("throws when neither key is configured", () => {
    config.set("deployments.accessTokenPrivateKey", "");
    config.set("deployments.accessTokenSecret", "");

    expect(() =>
      signDeploymentAccessToken({
        projectId: "project-1",
        sub: "user-1",
      }),
    ).toThrow("deployments.accessTokenPrivateKey is not configured");
  });
});
