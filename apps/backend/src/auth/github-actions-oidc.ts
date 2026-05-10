import { createPublicKey } from "node:crypto";
import type { JsonWebKey } from "node:crypto";
import jwt from "jsonwebtoken";
import z from "zod";

import { boom } from "@/util/error";
import { redisCache } from "@/util/redis";

const githubActionsIssuer = "https://token.actions.githubusercontent.com";
const githubActionsAudience = "https://argos-ci.com";
const githubActionsJwksUrl =
  "https://token.actions.githubusercontent.com/.well-known/jwks";

const JsonWebKeySchema = z.object({
  kid: z.string(),
  kty: z.literal("RSA"),
  n: z.string(),
  e: z.string(),
  alg: z.string().optional(),
  use: z.string().optional(),
});

const JsonWebKeySetSchema = z.object({
  keys: z.array(JsonWebKeySchema),
});

const GitHubActionsOidcClaimsSchema = z.object({
  iss: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  sub: z.string(),
  repository: z.string(),
  repository_id: z.string(),
  repository_owner: z.string(),
  repository_owner_id: z.string(),
  ref: z.string().optional(),
  ref_type: z.string().optional(),
  sha: z.string().optional(),
  workflow: z.string().optional(),
  workflow_ref: z.string().optional(),
  run_id: z.string().optional(),
  run_attempt: z.string().optional(),
  event_name: z.string().optional(),
  head_ref: z.string().optional(),
  base_ref: z.string().optional(),
});

export type GitHubActionsOidcClaims = z.infer<
  typeof GitHubActionsOidcClaimsSchema
>;

function toJsonWebKey(jwk: z.infer<typeof JsonWebKeySchema>): JsonWebKey {
  const key: JsonWebKey = {
    e: jwk.e,
    kid: jwk.kid,
    kty: jwk.kty,
    n: jwk.n,
  };

  if (jwk.alg) {
    key["alg"] = jwk.alg;
  }

  if (jwk.use) {
    key["use"] = jwk.use;
  }

  return key;
}

const gitHubActionsJwksCache = redisCache.createStore({
  maxAge: 5 * 60 * 1000,
  timeout: 10 * 1000,
  fetch: async () => {
    const response = await fetch(githubActionsJwksUrl);

    if (!response.ok) {
      throw boom(401, "Unable to verify GitHub Actions OIDC token.");
    }

    const jwks = JsonWebKeySetSchema.parse(await response.json());
    return jwks.keys;
  },
  getCacheKey: () => ["github-actions-jwks"],
});

async function getGitHubActionsSigningKey(token: string) {
  const decoded = jwt.decode(token, { complete: true });

  if (!decoded || typeof decoded === "string") {
    throw boom(401, "Invalid GitHub Actions OIDC token.");
  }

  const kid = decoded.header.kid;

  if (typeof kid !== "string") {
    throw boom(401, "Invalid GitHub Actions OIDC token.");
  }

  const keys = await gitHubActionsJwksCache.get();
  const jwk = keys.find((key) => key.kid === kid);

  if (!jwk) {
    throw boom(401, "Invalid GitHub Actions OIDC token.");
  }

  return createPublicKey({ key: toJsonWebKey(jwk), format: "jwk" });
}

export async function verifyGitHubActionsOidcToken(
  token: string,
): Promise<GitHubActionsOidcClaims> {
  try {
    const signingKey = await getGitHubActionsSigningKey(token);
    const payload = jwt.verify(token, signingKey, {
      issuer: githubActionsIssuer,
      audience: githubActionsAudience,
      algorithms: ["RS256"],
    });

    if (typeof payload !== "object") {
      throw boom(401, "Invalid GitHub Actions OIDC token.");
    }

    return GitHubActionsOidcClaimsSchema.parse(payload);
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      throw error;
    }
    throw boom(401, "Invalid GitHub Actions OIDC token.", { cause: error });
  }
}
