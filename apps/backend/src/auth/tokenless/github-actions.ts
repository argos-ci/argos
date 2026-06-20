import { invariant } from "@argos/util/invariant";
import pRetry from "p-retry";
import z from "zod";

import { GithubRepository, Project } from "@/database/models";
import { checkOctokitErrorStatus, getInstallationOctokit } from "@/github";
import { boom } from "@/util/error";

const marker = "tokenless-github-";

const AuthTokenPayloadSchema = z.object({
  owner: z.string(),
  repository: z.string(),
  jobId: z.string(),
  runId: z.string(),
  /**
   * Optional Argos project slug ("account/project-name") used to disambiguate
   * when several projects are linked to the same GitHub repository.
   */
  project: z.string().optional(),
});

/**
 * Decode bearer token.
 */
function decodeToken(bearerToken: string, marker: string) {
  try {
    const parts = bearerToken.split(marker);
    const base64 = parts[1];
    invariant(base64, "missing marker");
    const payload = Buffer.from(base64, "base64").toString("utf-8");
    const parsed = JSON.parse(payload);
    return AuthTokenPayloadSchema.parse(parsed);
  } catch {
    throw boom(401, `Invalid token (token: "${bearerToken}")`);
  }
}

/**
 * Compute the slug ("account/project-name") of a project. Requires the
 * `account` relation to be fetched.
 */
function getProjectSlug(project: Project): string {
  invariant(project.account, "account is not fetched");
  return `${project.account.slug}/${project.name}`;
}

type TokenlessGitHubActionsRun = {
  status: string | null;
  head_sha: string;
  head_branch: string | null;
};

export type TokenlessGitHubActionsContext = {
  project: Project;
  run: TokenlessGitHubActionsRun;
};

/**
 * Resolve the Argos project and GitHub workflow run associated with a tokenless
 * GitHub Actions bearer token. Returns null if no project is linked to this repository.
 */
export async function resolveTokenlessGitHubActionsContext(
  bearerToken: string,
): Promise<TokenlessGitHubActionsContext | null> {
  const authData = decodeToken(bearerToken, marker);

  const repository = await GithubRepository.query()
    .joinRelated("githubAccount")
    .withGraphJoined("[repoInstallations.installation, projects.account]")
    .where("githubAccount.login", authData.owner)
    .findOne("github_repositories.name", authData.repository)
    .orderBy("github_repositories.updatedAt", "desc")
    .first();

  if (!repository) {
    return null;
  }

  invariant(repository.projects);

  if (!repository.projects[0]) {
    return null;
  }

  let project: Project;

  if (authData.project) {
    // A project slug was provided: pick the matching project. This is what lets
    // a repository with several linked projects authenticate tokenless-ly.
    const matching = repository.projects.find(
      (candidate) => getProjectSlug(candidate) === authData.project,
    );

    if (!matching) {
      throw boom(
        400,
        `Project "${authData.project}" not found for GitHub repository (token: "${bearerToken}"). Ensure the project slug matches an Argos project linked to this repository.`,
      );
    }

    project = matching;
  } else {
    // No project slug: keep the legacy behavior and reject when the repository
    // is linked to more than one project, since we cannot disambiguate.
    if (repository.projects.length > 1) {
      throw boom(
        400,
        `Multiple projects found for GitHub repository (token: "${bearerToken}"). Please specify a project slug or a project token.`,
      );
    }

    project = repository.projects[0];
  }

  const installation = GithubRepository.pickBestInstallation(repository);

  if (!installation) {
    throw boom(
      401,
      "The Argos GitHub App is no longer installed on this repository. Reinstall the app or use a project token.",
    );
  }

  const octokit = await getInstallationOctokit(installation);

  if (!octokit) {
    throw boom(
      503,
      "Unable to authenticate with GitHub for this installation. Please retry.",
    );
  }

  const githubRun = await pRetry(
    async () => {
      try {
        const result = await octokit.actions.getWorkflowRun({
          owner: authData.owner,
          repo: authData.repository,
          run_id: Number(authData.runId),
          filter: "latest",
        });
        return result;
      } catch (error) {
        if (checkOctokitErrorStatus(404, error)) {
          return null;
        }
        throw error;
      }
    },
    { retries: 3 },
  );

  if (!githubRun) {
    throw boom(404, `GitHub run not found (token: "${bearerToken}")`);
  }

  const isRunInProgress =
    githubRun.data.status === "in_progress" ||
    // For some reason GitHub sometimes considers the job "queued"
    // It is not "unsafe" to allow this.
    githubRun.data.status === "queued";

  if (!isRunInProgress) {
    throw boom(401, `GitHub job is not in progress (token: "${bearerToken}")`);
  }

  return {
    project,
    run: {
      status: githubRun.data.status,
      head_sha: githubRun.data.head_sha,
      head_branch: githubRun.data.head_branch,
    },
  };
}

export const tokenlessGitHubActionsStrategy = {
  detect: (bearerToken: string) => bearerToken.startsWith(marker),
  getProject: async (bearerToken: string): Promise<Project | null> => {
    const context = await resolveTokenlessGitHubActionsContext(bearerToken);

    if (!context) {
      return null;
    }

    if (!context.project.tokenlessAuthEnabled) {
      throw boom(
        403,
        "Tokenless authentication is disabled for this project. Set the ARGOS_TOKEN environment variable to authenticate.",
      );
    }

    return context.project;
  },
};
