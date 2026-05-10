import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import { verifyGitHubActionsOidcToken } from "./github-actions-oidc";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const jwk = {
  ...publicKey.export({ format: "jwk" }),
  alg: "RS256",
  kid: "test-key",
  use: "sig",
};

const payload = {
  sub: "repo:argos-ci/argos:ref:refs/heads/main",
  repository: "argos-ci/argos",
  repository_id: "123",
  repository_owner: "argos-ci",
  repository_owner_id: "456",
  ref: "refs/heads/main",
  ref_type: "branch",
  sha: "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
};

const server = setupServer(
  http.get("https://token.actions.githubusercontent.com/.well-known/jwks", () =>
    HttpResponse.json({ keys: [jwk] }),
  ),
);

function signGitHubActionsToken(options?: { audience?: string }) {
  return jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    audience: options?.audience ?? "https://argos-ci.com",
    expiresIn: "5m",
    issuer: "https://token.actions.githubusercontent.com",
    keyid: "test-key",
  });
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("verifyGitHubActionsOidcToken", () => {
  test("verifies GitHub Actions OIDC claims", async () => {
    const claims = await verifyGitHubActionsOidcToken(signGitHubActionsToken());

    expect(claims).toMatchObject({
      aud: "https://argos-ci.com",
      iss: "https://token.actions.githubusercontent.com",
      repository: "argos-ci/argos",
      repository_id: "123",
      sha: "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
    });
  });

  test("rejects a token with the wrong audience", async () => {
    await expect(
      verifyGitHubActionsOidcToken(
        signGitHubActionsToken({ audience: "https://example.com" }),
      ),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid GitHub Actions OIDC token.",
    });
  });
});
