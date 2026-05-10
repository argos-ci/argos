import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import config from "@/config";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const jwk = {
  ...publicKey.export({ format: "jwk" }),
  alg: "RS256",
  kid: "test-key",
  use: "sig",
};

export const githubActionsOidcServer = setupServer(
  http.get("https://token.actions.githubusercontent.com/.well-known/jwks", () =>
    HttpResponse.json({ keys: [jwk] }),
  ),
);

export const defaultGitHubActionsPayload = {
  sub: "repo:argos-ci/argos:ref:refs/heads/main",
  repository: "argos-ci/argos",
  repository_id: "123",
  repository_owner: "argos-ci",
  repository_owner_id: "456",
  ref: "refs/heads/main",
  ref_type: "branch",
  sha: "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
};

export function signGitHubActionsToken(options?: { audience?: string }) {
  return jwt.sign(defaultGitHubActionsPayload, privateKey, {
    algorithm: "RS256",
    audience: options?.audience ?? config.get("api.baseUrl"),
    expiresIn: "5m",
    issuer: "https://token.actions.githubusercontent.com",
    keyid: "test-key",
  });
}
