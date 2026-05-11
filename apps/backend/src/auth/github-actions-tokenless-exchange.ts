import { boom } from "@/util/error";

import { createShortLivedProjectToken } from "./short-lived-project-token";
import { resolveTokenlessGitHubActionsContext } from "./tokenless/github-actions";

type GitHubActionsTokenlessExchangeInput = {
  tokenlessToken: string;
  commit: string;
  branch: string;
};

export async function exchangeGitHubActionsTokenlessToken(
  input: GitHubActionsTokenlessExchangeInput,
) {
  const context = await resolveTokenlessGitHubActionsContext(
    input.tokenlessToken,
  );

  if (!context) {
    throw boom(
      401,
      "Unable to resolve the GitHub Actions workflow run context. No Argos project may be linked to this workflow run, or the GitHub installation required to access it may be missing or disabled.",
    );
  }

  if (!context.project.tokenlessAuthEnabled) {
    throw boom(
      403,
      "Tokenless authentication is not enabled for this project.",
    );
  }

  if (context.run.head_sha !== input.commit) {
    throw boom(401, "GitHub Actions workflow run does not match commit.");
  }

  if (context.run.head_branch !== input.branch) {
    throw boom(401, "GitHub Actions workflow run does not match branch.");
  }

  return createShortLivedProjectToken({
    projectId: context.project.id,
    source: "github-actions-tokenless",
  });
}
