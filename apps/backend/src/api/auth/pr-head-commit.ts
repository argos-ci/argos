import type {
  AuthOAuthPayload,
  AuthPATPayload,
  AuthProjectPayload,
  AuthSessionPayload,
} from "@/auth/payload";
import { GithubRepository, type Project } from "@/database/models";
import { checkOctokitErrorStatus, getInstallationOctokit } from "@/github";
import { boom } from "@/util/error";

/**
 * Whether `headCommit` is the head of the pull request whose test merge
 * commit is `mergeCommit`. Either the pull request still points at it, or it
 * is the second parent of the merge commit, which covers a push landing after
 * the run started. The merge commit is read only with content access.
 */
async function checkIsPullRequestHead(input: {
  project: Project;
  pullRequestNumber: number;
  mergeCommit: string;
  headCommit: string;
}): Promise<boolean> {
  const { project } = input;
  await project.$fetchGraph(
    "githubRepository.[githubAccount, repoInstallations.installation]",
    { skipFetched: true },
  );
  const repository = project.githubRepository;
  if (!repository?.githubAccount) {
    return false;
  }
  const installation = GithubRepository.pickBestInstallation(repository);
  const octokit = installation
    ? await getInstallationOctokit(installation)
    : null;
  if (!octokit) {
    throw boom(503, "Unable to reach GitHub to verify the commit. Retry.");
  }
  const params = {
    owner: repository.githubAccount.login,
    repo: repository.name,
  };

  const readOrNull = async <T>(request: Promise<{ data: T }>) => {
    try {
      return (await request).data;
    } catch (error) {
      if (
        checkOctokitErrorStatus(404, error) ||
        checkOctokitErrorStatus(403, error)
      ) {
        return null;
      }
      throw error;
    }
  };

  const pullRequest = await readOrNull(
    octokit.rest.pulls.get({ ...params, pull_number: input.pullRequestNumber }),
  );
  if (pullRequest?.head.sha === input.headCommit) {
    return true;
  }

  const mergeCommit = await readOrNull(
    octokit.rest.repos.getCommit({ ...params, ref: input.mergeCommit }),
  );
  const [, head, ...others] = mergeCommit?.parents ?? [];
  return others.length === 0 && head?.sha === input.headCommit;
}

/**
 * Argos posts a build's status on `prHeadCommit`, so a bearer bound to a
 * commit may only name its own commit there, or the head of the pull request
 * it was minted for.
 */
export async function assertAuthPrHeadCommit(
  auth:
    | AuthSessionPayload
    | AuthPATPayload
    | AuthProjectPayload
    | AuthOAuthPayload,
  input: { project: Project; prHeadCommit: string | null | undefined },
): Promise<void> {
  if (auth.type !== "project" || !auth.sha) {
    return;
  }
  const { prHeadCommit } = input;
  if (!prHeadCommit || prHeadCommit === auth.sha) {
    return;
  }
  const isPullRequestHead =
    auth.pullRequestNumber !== null &&
    (await checkIsPullRequestHead({
      project: input.project,
      pullRequestNumber: auth.pullRequestNumber,
      mergeCommit: auth.sha,
      headCommit: prHeadCommit,
    }));
  if (!isPullRequestHead) {
    throw boom(
      401,
      "Token is bound to a commit whose pull request head is not the one provided.",
    );
  }
}
