import { invariant } from "@argos/util/invariant";

import type { AuthProjectPayload } from "@/auth/payload";
import { Project, UserAccessToken } from "@/database/models";
import { boom } from "@/util/error";

import { tokenlessGitHubActionsStrategy } from "./tokenless/github-actions";

const tokenlessStrategies = [tokenlessGitHubActionsStrategy];

export async function getAuthProjectPayloadFromBearerToken(bearer: string) {
  if (UserAccessToken.isValidUserAccessToken(bearer)) {
    throw boom(
      401,
      "This endpoint is not accessible with a user access token, only with a an Argos project token.",
    );
  }

  const strategy =
    tokenlessStrategies.find((strategy) => strategy.detect(bearer)) ?? null;

  const project = strategy
    ? await strategy.getProject(bearer)
    : await Project.query().findOne({ token: bearer });

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

  invariant(project.account, "Account not loaded on project");

  const authPayload: AuthProjectPayload = {
    type: "project",
    project,
  };
  return authPayload;
}
