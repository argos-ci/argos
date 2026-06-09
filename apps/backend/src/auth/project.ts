import type { AuthProjectPayload } from "@/auth/payload";
import { Project, UserAccessToken } from "@/database/models";
import { encryptDeterministic } from "@/database/services/encrypt";
import { boom } from "@/util/error";

import {
  getProjectFromShortLivedProjectToken,
  isShortLivedProjectToken,
} from "./short-lived-project-token";
import { tokenlessStrategies } from "./tokenless";

/**
 * Resolve a project auth payload from a project token or a supported tokenless
 * CI bearer token.
 */
export async function getAuthProjectPayloadFromBearerToken(bearer: string) {
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

    return {
      type: "project",
      project: resolved.project,
      sha: resolved.sha,
    } satisfies AuthProjectPayload;
  }

  const strategy =
    tokenlessStrategies.find((strategy) => strategy.detect(bearer)) ?? null;

  const project = strategy
    ? await strategy.getProject(bearer)
    : await Project.query()
        .where("token", encryptDeterministic(bearer))
        .orWhere("token", bearer)
        .first();

  if (!project && strategy) {
    throw boom(
      401,
      `Project not found. Ensure a project exists in Argos (https://app.argos-ci.com) and restart your test after setup. Persisting issue? Consider adding 'ARGOS_TOKEN' to your CI environment variables. (token: "${bearer}").`,
    );
  }

  if (!project) {
    throw boom(
      401,
      `Project not found in Argos. If the issue persists, verify your token. (token: "${bearer}").`,
    );
  }

  const authPayload: AuthProjectPayload = {
    type: "project",
    project,
    sha: null,
  };
  return authPayload;
}
