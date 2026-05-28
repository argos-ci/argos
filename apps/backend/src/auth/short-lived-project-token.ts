import { assertNever } from "@argos/util/assertNever";
import z from "zod";

import { Project } from "@/database/models";
import { generateRandomString, hashToken } from "@/database/services/crypto";
import { getRedisClient } from "@/util/redis/client";

const SHORT_LIVED_PROJECT_TOKEN_PREFIX = "argos_tmp_";
const SHORT_LIVED_PROJECT_TOKEN_TTL_MS = 10 * 60 * 1000;

const ShortLivedProjectTokenPayloadSchema = z.object({
  projectId: z.string(),
  source: z.enum(["github-actions-oidc", "github-actions-tokenless"]),
  sha: z.string().nullable().optional(),
});

type ShortLivedProjectTokenPayload = z.infer<
  typeof ShortLivedProjectTokenPayloadSchema
>;

function getShortLivedProjectTokenKey(token: string) {
  return `auth:short-lived-project-token:${hashToken(token)}`;
}

/**
 * Test if the token is a short lived project token.
 */
export function isShortLivedProjectToken(token: string) {
  return token.startsWith(SHORT_LIVED_PROJECT_TOKEN_PREFIX);
}

/**
 * Create a short-lived project token that lives only 10 min.
 */
export async function createShortLivedProjectToken(
  payload: ShortLivedProjectTokenPayload,
): Promise<{ token: string; expiresAt: string }> {
  const redis = await getRedisClient();
  const token = `${SHORT_LIVED_PROJECT_TOKEN_PREFIX}${generateRandomString(40)}`;
  const expiresAt = new Date(
    Date.now() + SHORT_LIVED_PROJECT_TOKEN_TTL_MS,
  ).toISOString();

  await redis.set(
    getShortLivedProjectTokenKey(token),
    JSON.stringify(payload),
    {
      expiration: {
        type: "PX",
        value: SHORT_LIVED_PROJECT_TOKEN_TTL_MS,
      },
    },
  );

  return { token, expiresAt };
}

export type ResolvedShortLivedProjectToken = {
  project: Project;
  sha: string | null;
};

/**
 * Get a project from a short lived project token.
 */
export async function getProjectFromShortLivedProjectToken(
  token: string,
): Promise<ResolvedShortLivedProjectToken | null> {
  if (!isShortLivedProjectToken(token)) {
    return null;
  }

  const redis = await getRedisClient();
  const json = await redis.get(getShortLivedProjectTokenKey(token));

  if (!json) {
    return null;
  }

  const parsed = (() => {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  })();

  const result = ShortLivedProjectTokenPayloadSchema.safeParse(parsed);

  if (!result.success) {
    return null;
  }

  const project = await Project.query().findById(result.data.projectId);

  if (!project) {
    return null;
  }

  const sha = result.data.sha ?? null;

  switch (result.data.source) {
    case "github-actions-oidc":
      return project.githubActionsOidcEnabled ? { project, sha } : null;
    case "github-actions-tokenless":
      return project.tokenlessAuthEnabled ? { project, sha } : null;
    default:
      assertNever(result.data.source);
  }
}
