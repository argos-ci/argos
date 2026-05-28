import { invariant } from "@argos/util/invariant";

import { GithubRepository } from "@/database/models";
import { boom } from "@/util/error";

import { verifyGitHubActionsOidcToken } from "./github-actions-oidc";
import { createShortLivedProjectToken } from "./short-lived-project-token";

type GitHubActionsOidcExchangeInput = {
  oidcToken: string;
  repository?: string | undefined;
  commit?: string | undefined;
};

function parseGitHubRepositoryId(repositoryId: string) {
  const parsed = Number(repositoryId);

  if (!Number.isSafeInteger(parsed)) {
    throw boom(401, "Invalid GitHub Actions OIDC token.");
  }

  return parsed;
}

function assertOptionalClaimsMatchInput(
  claims: Awaited<ReturnType<typeof verifyGitHubActionsOidcToken>>,
  input: GitHubActionsOidcExchangeInput,
) {
  if (
    input.repository &&
    claims.repository.toLowerCase() !== input.repository.toLowerCase()
  ) {
    throw boom(401, "GitHub Actions OIDC token does not match repository.");
  }

  if (input.commit && claims.sha !== input.commit) {
    throw boom(401, "GitHub Actions OIDC token does not match commit.");
  }
}

export async function exchangeGitHubActionsOidcToken(
  input: GitHubActionsOidcExchangeInput,
) {
  const claims = await verifyGitHubActionsOidcToken(input.oidcToken);
  assertOptionalClaimsMatchInput(claims, input);

  const repository = await GithubRepository.query()
    .withGraphFetched("[repoInstallations.installation, projects]")
    .findOne({ githubId: parseGitHubRepositoryId(claims.repository_id) });

  if (!repository) {
    throw boom(401, "No Argos project is linked to this GitHub repository.");
  }

  invariant(repository.projects, "Relation `projects` not loaded");

  if (repository.projects.length === 0) {
    throw boom(401, "No Argos project is linked to this GitHub repository.");
  }

  if (repository.projects.length > 1) {
    throw boom(
      400,
      "Multiple Argos projects are linked to this GitHub repository.",
    );
  }

  const project = repository.projects[0];
  invariant(project, "Project not found");

  if (!project.githubActionsOidcEnabled) {
    throw boom(
      403,
      "GitHub Actions OIDC authentication is not enabled for this project.",
    );
  }

  return createShortLivedProjectToken({
    projectId: project.id,
    source: "github-actions-oidc",
    sha: claims.sha ?? null,
  });
}
