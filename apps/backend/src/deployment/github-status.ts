import { invariant } from "@argos/util/invariant";

import { GithubRepository, Project } from "@/database/models";
import type { Deployment } from "@/database/models/Deployment";
import { getInstallationOctokit } from "@/github";
import { createGhCommitStatus } from "@/github/commit-status";

/**
 * Post a GitHub commit status for a Deployment.
 */
export async function postDeploymentCommitStatus(params: {
  project: Project;
  deployment: Pick<Deployment, "commitSha" | "url" | "status">;
}) {
  const { project, deployment } = params;

  if (!deployment.commitSha) {
    return;
  }

  await project.$fetchGraph(
    "githubRepository.[githubAccount, repoInstallations.installation]",
    { skipFetched: true },
  );

  const githubRepository = project.githubRepository;
  if (!githubRepository) {
    return;
  }

  invariant(
    githubRepository.githubAccount,
    'Relation "githubAccount" not loaded',
  );

  const installation = GithubRepository.pickBestInstallation(githubRepository);
  if (!installation) {
    return;
  }

  const octokit = await getInstallationOctokit(installation);
  if (!octokit) {
    return;
  }

  await createGhCommitStatus(octokit, {
    owner: githubRepository.githubAccount.login,
    repo: githubRepository.name,
    sha: deployment.commitSha,
    state: "success",
    target_url: deployment.url,
    context: `argos/deployment/${project.name}`,
    description: "Storybook preview ready",
  });
}
