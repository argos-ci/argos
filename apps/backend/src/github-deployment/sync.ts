import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import {
  Deployment,
  DeploymentAlias,
  GithubPullRequest,
  GithubRepository,
} from "@/database/models";
import { getDeploymentPreferredUrl } from "@/deployment/url";
import {
  checkOctokitErrorStatus,
  getInstallationOctokit,
  type Octokit,
  type RestEndpointMethodTypes,
} from "@/github";
import {
  fetchPullRequest,
  parsePullRequestData,
} from "@/github-pull-request/remote";
import { UnretryableError } from "@/job-core";
import parentLogger from "@/logger";

const logger = parentLogger.child({ module: "github-deployment" });

type GitHubDeploymentState =
  RestEndpointMethodTypes["repos"]["createDeploymentStatus"]["parameters"]["state"];

type RepositoryParams = { owner: string; repo: string };

/**
 * Whether the deployment is still the one its environment serves: the latest
 * production deployment holds the production domains, and the latest preview
 * of a branch holds the branch alias.
 */
function checkIsCurrent(
  deployment: Deployment,
  aliases: DeploymentAlias[],
): boolean {
  const type = deployment.environment === "production" ? "domain" : "branch";
  return aliases.some((alias) => alias.type === type);
}

function getGitHubDeploymentState(
  deployment: Deployment,
  aliases: DeploymentAlias[],
): GitHubDeploymentState {
  switch (deployment.status) {
    case "pending":
      return "in_progress";
    case "error":
      return "error";
    case "ready":
      return checkIsCurrent(deployment, aliases) ? "success" : "inactive";
    default:
      return assertNever(deployment.status);
  }
}

/**
 * Whether a GitHub error means the deployment cannot be reported rather than
 * that the request should be retried: the installation has not accepted the
 * deployments permission yet, the repository is archived or gone, or the
 * commit no longer exists after a force-push.
 */
function checkIsUnreportable(error: unknown): boolean {
  return [403, 404, 409, 422].some((status) =>
    checkOctokitErrorStatus(status, error),
  );
}

async function checkIsFromFork(input: {
  octokit: Octokit;
  repository: RepositoryParams;
  pullRequest: GithubPullRequest;
}): Promise<boolean> {
  const { octokit, repository, pullRequest } = input;
  if (pullRequest.headFromFork !== null) {
    return pullRequest.headFromFork;
  }
  // The pull request job fills it, and it may not have run yet.
  const data = await fetchPullRequest(octokit, {
    ...repository,
    pull_number: pullRequest.number,
  });
  return data ? parsePullRequestData(data).headFromFork : true;
}

/**
 * GitHub runs the `deployment` and `deployment_status` workflows of the
 * repository on the deployed commit, with the repository's secrets. So only a
 * commit the team chose gets a GitHub deployment: a tokenless bearer is not
 * tied to a commit, and a fork's pull request is an outsider's code.
 */
async function checkCanCreateGitHubDeployment(input: {
  octokit: Octokit;
  repository: RepositoryParams;
  deployment: Deployment;
}): Promise<boolean> {
  const { deployment } = input;
  switch (deployment.authSource) {
    case "project-token":
    case "github-actions-oidc":
      break;
    case "github-actions-tokenless":
    case null:
      return false;
    default:
      assertNever(deployment.authSource);
  }

  if (!deployment.githubPullRequestId) {
    return true;
  }

  invariant(
    deployment.pullRequest,
    "Relation `pullRequest` not loaded",
    UnretryableError,
  );

  return !(await checkIsFromFork({
    ...input,
    pullRequest: deployment.pullRequest,
  }));
}

async function createGitHubDeployment(input: {
  octokit: Octokit;
  repository: RepositoryParams;
  deployment: Deployment;
  projectName: string;
}): Promise<string | null> {
  const { octokit, repository, deployment, projectName } = input;
  try {
    const { data } = await octokit.repos.createDeployment({
      ...repository,
      // A pull request only lists the deployments of its head commit.
      ref: deployment.prHeadCommit ?? deployment.commitSha,
      environment: `${projectName}/${deployment.environment}`,
      production_environment: deployment.environment === "production",
      // By default GitHub merges the default branch into `ref`, and refuses to
      // deploy until every status of the commit succeeds, Argos builds included.
      auto_merge: false,
      required_contexts: [],
    });
    invariant("id" in data, "GitHub did not create a deployment");
    return String(data.id);
  } catch (error) {
    if (checkIsUnreportable(error)) {
      logger.info(
        { deploymentId: deployment.id, error },
        "GitHub refused to create the deployment",
      );
      return null;
    }
    throw error;
  }
}

async function createGitHubDeploymentStatus(input: {
  octokit: Octokit;
  repository: RepositoryParams;
  deployment: Deployment;
  githubDeploymentId: string;
  state: GitHubDeploymentState;
  environmentUrl: string | null;
}) {
  const { octokit, repository, deployment, githubDeploymentId, state } = input;
  try {
    await octokit.repos.createDeploymentStatus({
      ...repository,
      deployment_id: Number(githubDeploymentId),
      state,
      ...(input.environmentUrl && { environment_url: input.environmentUrl }),
      // The previews of every branch share an environment, and GitHub would
      // mark the other branches' previews inactive. Argos marks a deployment
      // inactive itself, once another one takes its aliases.
      auto_inactive: false,
    });
  } catch (error) {
    if (checkIsUnreportable(error)) {
      logger.info(
        { deploymentId: deployment.id, githubDeploymentId, state, error },
        "GitHub refused to create the deployment status",
      );
      return;
    }
    throw error;
  }
}

/**
 * Report a deployment to GitHub as a GitHub deployment, from its current
 * state. Idempotent: it creates the GitHub deployment once, then adds a status.
 */
export async function syncGitHubDeployment(deploymentId: string) {
  const deployment = await Deployment.query()
    .findById(deploymentId)
    .withGraphFetched(
      "[aliases, pullRequest, project.githubRepository.[githubAccount, repoInstallations.installation]]",
    );

  invariant(deployment, "Deployment not found", UnretryableError);
  const { aliases, project } = deployment;
  invariant(aliases, "Relation `aliases` not loaded", UnretryableError);
  invariant(project, "Relation `project` not loaded", UnretryableError);

  const state = getGitHubDeploymentState(deployment, aliases);

  // Superseded before GitHub heard of it: there is nothing to show.
  if (!deployment.githubDeploymentId && state === "inactive") {
    return;
  }

  const { githubRepository } = project;
  if (!githubRepository) {
    return;
  }

  const { githubAccount } = githubRepository;
  invariant(githubAccount, "Relation `githubAccount` not loaded");

  const installation = GithubRepository.pickBestInstallation(githubRepository);
  if (!installation) {
    return;
  }

  const octokit = await getInstallationOctokit(installation);
  if (!octokit) {
    return;
  }

  const repository = {
    owner: githubAccount.login,
    repo: githubRepository.name,
  };

  let { githubDeploymentId } = deployment;

  if (!githubDeploymentId) {
    const canCreate = await checkCanCreateGitHubDeployment({
      octokit,
      repository,
      deployment,
    });
    if (!canCreate) {
      return;
    }

    githubDeploymentId = await createGitHubDeployment({
      octokit,
      repository,
      deployment,
      projectName: project.name,
    });
    if (!githubDeploymentId) {
      return;
    }

    await deployment.$query().patch({ githubDeploymentId });
  }

  await createGitHubDeploymentStatus({
    octokit,
    repository,
    deployment,
    githubDeploymentId,
    state,
    environmentUrl:
      state === "success"
        ? getDeploymentPreferredUrl({ slug: deployment.slug, aliases })
        : null,
  });
}
