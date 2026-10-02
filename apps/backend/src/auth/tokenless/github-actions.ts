import { invariant } from "@argos/util/invariant";
import pRetry from "p-retry";
import z from "zod";

import {
  GithubInstallation,
  GithubRepository,
  Project,
} from "@/database/models";
import { checkOctokitErrorStatus, getInstallationOctokit } from "@/github";
import { boom } from "@/util/error";
import { redisCache } from "@/util/redis";
import { getRedisClient } from "@/util/redis/client";

const marker = "tokenless-github-";

/**
 * Anyone can forge a token naming a linked repository, and every run it names
 * costs a request against the GitHub rate limit of the repository's
 * installation, the one its status checks and comments draw from. So an
 * installation gets this many lookups per window that do not find the run in
 * progress. A lookup that finds it is given back: forged tokens are capped, the
 * real runs of a busy installation are not.
 */
export const FAILED_RUN_LOOKUPS_LIMIT = 100;
const FAILED_RUN_LOOKUPS_WINDOW_MS = 10 * 60 * 1000;

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
 * Count a run lookup against the installation, or refuse it once the
 * installation has used up its failed lookups for the window. Returns a
 * function giving the lookup back.
 */
async function reserveRunLookup(installation: GithubInstallation) {
  const redis = await getRedisClient();
  // A lookup given back after its window has ended decrements a key nothing
  // reads anymore, rather than the next window's. The expiry is set in the same
  // transaction so that no crash leaves the key without one.
  const window = Math.floor(Date.now() / FAILED_RUN_LOOKUPS_WINDOW_MS);
  const key = `tokenless-github-run-lookups:${installation.id}:${window}`;
  const [count] = await redis
    .multi()
    .incr(key)
    .pExpire(key, FAILED_RUN_LOOKUPS_WINDOW_MS)
    .execTyped();

  if (count > FAILED_RUN_LOOKUPS_LIMIT) {
    throw boom(
      429,
      "Too many failed tokenless authentication attempts for this GitHub installation. Retry later, or set the ARGOS_TOKEN environment variable to authenticate.",
    );
  }

  return async () => {
    await redis
      .multi()
      .decr(key)
      .pExpire(key, FAILED_RUN_LOOKUPS_WINDOW_MS)
      .execTyped();
  };
}

type WorkflowRunLookup = {
  bearerToken: string;
  installation: GithubInstallation;
  owner: string;
  repository: string;
  runId: number;
};

/**
 * Runs recently seen in progress. An SDK sending the tokenless token on every
 * request, and the shards of a run finishing together, would otherwise each
 * look the run up. Only runs in progress are kept, the other outcomes are
 * thrown: a run re-run after it completed must not be refused from a stale
 * answer.
 *
 * A run keeps authenticating for up to `maxAge` after it completes, well within
 * the 10 minutes the short-lived token from the exchange lives anyway.
 */
const inProgressRunStore = redisCache.createStore({
  maxAge: 60 * 1000,
  // The default (3s) would cut the retries short.
  timeout: 20 * 1000,
  getCacheKey: (lookup: WorkflowRunLookup) => [
    "tokenless-github-run",
    lookup.owner,
    lookup.repository,
    lookup.runId,
  ],
  fetch: async (
    lookup: WorkflowRunLookup,
  ): Promise<TokenlessGitHubActionsRun> => {
    const giveBack = await reserveRunLookup(lookup.installation);

    const octokit = await getInstallationOctokit(lookup.installation);

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
            owner: lookup.owner,
            repo: lookup.repository,
            run_id: lookup.runId,
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
      throw boom(404, `GitHub run not found (token: "${lookup.bearerToken}")`);
    }

    const isRunInProgress =
      githubRun.data.status === "in_progress" ||
      // For some reason GitHub sometimes considers the job "queued"
      // It is not "unsafe" to allow this.
      githubRun.data.status === "queued";

    if (!isRunInProgress) {
      throw boom(
        401,
        `GitHub job is not in progress (token: "${lookup.bearerToken}")`,
      );
    }

    await giveBack();

    return {
      status: githubRun.data.status,
      head_sha: githubRun.data.head_sha,
      head_branch: githubRun.data.head_branch,
    };
  },
});

/**
 * Resolve the Argos project and GitHub workflow run associated with a tokenless
 * GitHub Actions bearer token. Returns null if no project is linked to this
 * repository, and throws if the project does not accept tokenless
 * authentication.
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

  // Dropped here rather than in the graph: the deleted rows still hold the
  // repository link, and leaving them in would let one shadow the live project
  // as "multiple projects found".
  const projects = repository.projects.filter(
    (candidate) => candidate.deletedAt === null,
  );

  if (!projects[0]) {
    return null;
  }

  let project: Project;

  if (authData.project) {
    // A project slug was provided: pick the matching project. This is what lets
    // a repository with several linked projects authenticate tokenless-ly.
    const matching = projects.find(
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
    if (projects.length > 1) {
      throw boom(
        400,
        `Multiple projects found for GitHub repository (token: "${bearerToken}"). Please specify a project slug or a project token.`,
      );
    }

    project = projects[0];
  }

  // Before anything reaches GitHub: forging the token takes nothing but the
  // repository's name, and every lookup spends its installation's rate limit.
  if (!project.tokenlessAuthEnabled) {
    throw boom(
      403,
      "Tokenless authentication is disabled for this project. Set the ARGOS_TOKEN environment variable to authenticate.",
    );
  }

  const installation = GithubRepository.pickBestInstallation(repository);

  if (!installation) {
    throw boom(
      401,
      "The Argos GitHub App is no longer installed on this repository. Reinstall the app or use a project token.",
    );
  }

  const run = await inProgressRunStore.get({
    bearerToken,
    installation,
    owner: authData.owner,
    repository: authData.repository,
    runId: Number(authData.runId),
  });

  return { project, run };
}

export const tokenlessGitHubActionsStrategy = {
  detect: (bearerToken: string) => bearerToken.startsWith(marker),
  getProject: async (bearerToken: string): Promise<Project | null> => {
    const context = await resolveTokenlessGitHubActionsContext(bearerToken);

    if (!context) {
      return null;
    }

    return context.project;
  },
};
