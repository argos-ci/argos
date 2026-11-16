import { PROJECT_TOKEN_PERMISSION_LIST } from "@argos/schemas/project-token";
import { invariant } from "@argos/util/invariant";

import { waitUntil } from "@/api/request-context";
import type { AuthProjectPayload } from "@/auth/payload";
import { Project, ProjectToken, UserAccessToken } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { boom } from "@/util/error";

import {
  getProjectFromShortLivedProjectToken,
  isShortLivedProjectToken,
} from "./short-lived-project-token";
import { tokenlessStrategies } from "./tokenless";

/**
 * How stale `lastUsedAt` may get before a request refreshes it. CI sends a
 * request per screenshot batch, so writing it on every one would turn each
 * upload into a stream of updates on the same row.
 */
const LAST_USED_AT_PRECISION_MS = 5 * 60 * 1000;

/**
 * Payload of a bearer bound to a single project with every permission: a
 * short-lived token minted from a CI identity, or a tokenless CI bearer.
 */
function getSingleProjectPayload(
  project: Project,
  sha: string | null,
): AuthProjectPayload {
  return {
    type: "project",
    projects: [project],
    permissions: PROJECT_TOKEN_PERMISSION_LIST,
    sha,
  };
}

/**
 * The token with its account and live projects, in the one query every CI
 * request runs. Not `findOne`: its `LIMIT 1` would cut the joined rows.
 */
async function findProjectToken(bearer: string) {
  const [projectToken] = await ProjectToken.query()
    .where("project_tokens.token", hashToken(bearer))
    .withGraphJoined("[account, projects(live)]")
    .modifiers({
      live: (query) => query.whereNull("projects.deletedAt"),
    });
  return projectToken ?? null;
}

async function getAuthPayloadFromProjectToken(
  bearer: string,
): Promise<AuthProjectPayload> {
  const projectToken = await findProjectToken(bearer);

  if (!projectToken) {
    throw boom(
      401,
      `Project not found in Argos. If the issue persists, verify your token. (token: "${bearer}").`,
    );
  }

  if (projectToken.$isExpired()) {
    throw boom(401, "This project token has expired. Create a new one.");
  }

  const { account } = projectToken;
  invariant(account, "Project token account not fetched");
  invariant(projectToken.projects, "Project token projects not fetched");
  // The rule of `getProjectsByTokenId`: only the projects of its own account.
  const projects = projectToken.projects.filter(
    (project) => project.accountId === projectToken.accountId,
  );
  for (const project of projects) {
    project.account = account;
  }

  if (projects.length === 0) {
    throw boom(
      401,
      "This project token is no longer linked to any project. Create a new one.",
    );
  }

  const { lastUsedAt } = projectToken;
  if (
    !lastUsedAt ||
    Date.now() - new Date(lastUsedAt).getTime() > LAST_USED_AT_PRECISION_MS
  ) {
    await waitUntil(
      ProjectToken.query()
        .findById(projectToken.id)
        .patch({ lastUsedAt: new Date().toISOString() }),
    );
  }

  return {
    type: "project",
    projects,
    permissions: projectToken.permissions,
    sha: null,
  };
}

/**
 * Resolve a project auth payload from a project token or a supported tokenless
 * CI bearer token.
 */
export async function getAuthProjectPayloadFromBearerToken(
  bearer: string,
): Promise<AuthProjectPayload> {
  if (UserAccessToken.isValidUserAccessToken(bearer)) {
    throw boom(
      401,
      "This endpoint is not accessible with a user access token, only with a an Argos project token.",
    );
  }

  if (isShortLivedProjectToken(bearer)) {
    const resolved = await getProjectFromShortLivedProjectToken(bearer);

    if (!resolved) {
      throw boom(401, "Short-lived project token has expired or is invalid.");
    }

    return getSingleProjectPayload(resolved.project, resolved.sha);
  }

  const strategy = tokenlessStrategies.find((strategy) =>
    strategy.detect(bearer),
  );

  if (!strategy) {
    return getAuthPayloadFromProjectToken(bearer);
  }

  const project = await strategy.getProject(bearer);

  if (!project) {
    throw boom(
      401,
      `Project not found. Ensure a project exists in Argos (https://app.argos-ci.com) and restart your test after setup. Persisting issue? Consider adding 'ARGOS_TOKEN' to your CI environment variables. (token: "${bearer}").`,
    );
  }

  return getSingleProjectPayload(project, null);
}
