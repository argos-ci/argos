import type { AuthProjectPayload } from "@/auth/payload";
import { GithubRepository, type Project } from "@/database/models";
import { checkOctokitErrorStatus, getInstallationOctokit } from "@/github";
import { fetchPullRequest } from "@/github-pull-request/remote";
import { boom } from "@/util/error";
import { redisCache } from "@/util/redis";

type PullRequestHeadQuestion = {
  project: Project;
  pullRequestNumber: number;
  mergeCommit: string;
  headCommit: string;
};

/**
 * Whether `headCommit` is the head of the pull request whose test merge
 * commit is `mergeCommit`. Either the pull request still points at it, or it
 * is the second parent of the merge commit, which covers a push landing after
 * the run started. The merge commit is read only with content access.
 */
async function checkIsPullRequestHead(
  input: PullRequestHeadQuestion,
): Promise<boolean> {
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

  const pullRequest = await fetchPullRequest(octokit, {
    ...params,
    pull_number: input.pullRequestNumber,
  });
  if (pullRequest?.head.sha === input.headCommit) {
    return true;
  }

  try {
    const { data } = await octokit.rest.repos.getCommit({
      ...params,
      ref: input.mergeCommit,
    });
    const [, head, ...others] = data.parents;
    return others.length === 0 && head?.sha === input.headCommit;
  } catch (error) {
    if (
      checkOctokitErrorStatus(404, error) ||
      checkOctokitErrorStatus(403, error)
    ) {
      return false;
    }
    throw error;
  }
}

/**
 * Every shard of a parallel build asks the same question, and the answer for a
 * merge commit does not change while the bearer lives.
 */
const pullRequestHeadStore = redisCache.createStore({
  getCacheKey: (input: PullRequestHeadQuestion) => [
    "pull-request-head",
    input.project.id,
    input.pullRequestNumber,
    input.mergeCommit,
    input.headCommit,
  ],
  fetch: checkIsPullRequestHead,
  maxAge: 10 * 60 * 1000,
  // The default (3s) is too short for two GitHub calls.
  timeout: 20 * 1000,
});

/**
 * Argos posts a build's status on `prHeadCommit`, so a bearer bound to a
 * commit may only name its own commit there, or the head of the pull request
 * it was minted for.
 */
export async function assertAuthPrHeadCommit(
  auth: AuthProjectPayload,
  input: { project: Project; prHeadCommit: string | null | undefined },
): Promise<void> {
  const { prHeadCommit } = input;
  if (!auth.sha || !prHeadCommit || prHeadCommit === auth.sha) {
    return;
  }
  const isPullRequestHead =
    auth.pullRequestNumber !== null &&
    (await pullRequestHeadStore.get({
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
