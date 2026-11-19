import { invariant } from "@argos/util/invariant";

import {
  Build,
  GithubPullRequest,
  OriginPullRequest,
  type Project,
} from "@/database/models";

type PullRequest = GithubPullRequest | OriginPullRequest;

/**
 * How many pull requests a stack is followed through, in each direction. Each
 * one costs a query on every build page that shows the stack.
 */
const MAX_STACK_DEPTH = 20;

/**
 * The open pull request whose head is `branch`, in the repository of
 * `pullRequest`.
 *
 * A fork's branch can share its name with one of the repository's, so only
 * pull requests from the repository itself qualify.
 */
async function findOpenPullRequestByHead(
  pullRequest: PullRequest,
  branch: string,
): Promise<PullRequest | null> {
  if (pullRequest instanceof GithubPullRequest) {
    const found = await GithubPullRequest.query()
      .where("githubRepositoryId", pullRequest.githubRepositoryId)
      .where("headRef", branch)
      .where("headFromFork", false)
      .where("state", "open")
      .orderBy("number", "desc")
      .first();
    return found ?? null;
  }
  const found = await OriginPullRequest.query()
    .where("originRepositoryId", pullRequest.originRepositoryId)
    .where("headRef", branch)
    .where("state", "open")
    .orderBy("number", "desc")
    .first();
  return found ?? null;
}

/**
 * The open pull requests merging into the head branch of `pullRequest`, at
 * most two: one continues the stack, two means it forks.
 */
async function findOpenChildPullRequests(
  pullRequest: PullRequest,
): Promise<PullRequest[]> {
  const { headRef } = pullRequest;
  if (!headRef) {
    return [];
  }
  if (pullRequest instanceof GithubPullRequest) {
    if (pullRequest.headFromFork !== false) {
      return [];
    }
    return GithubPullRequest.query()
      .where("githubRepositoryId", pullRequest.githubRepositoryId)
      .where("baseRef", headRef)
      .where("state", "open")
      .orderBy("number", "desc")
      .limit(2);
  }
  return OriginPullRequest.query()
    .where("originRepositoryId", pullRequest.originRepositoryId)
    .where("baseRef", headRef)
    .where("state", "open")
    .orderBy("number", "desc")
    .limit(2);
}

/**
 * Whether a build's pull request is stacked on another one: its base branch is
 * the head of another open pull request, and builds on it are not
 * auto-approved.
 */
export async function checkIsStackedPullRequest(args: {
  project: Project;
  pullRequest: PullRequest | null;
  baseBranch: string | null;
}): Promise<boolean> {
  const { project, pullRequest, baseBranch } = args;
  if (!pullRequest || !baseBranch) {
    return false;
  }
  const isAutoApprovedBranch = await project.$getAutoApprovedBranchMatcher();
  if (isAutoApprovedBranch(baseBranch)) {
    return false;
  }
  const parent = await findOpenPullRequestByHead(pullRequest, baseBranch);
  return parent !== null;
}

export type PullRequestStack = {
  /**
   * The pull requests of the stack, from its top down to the one merging into
   * `baseBranch`.
   */
  pullRequests: PullRequest[];
  /** The branch the bottom pull request merges into. */
  baseBranch: string | null;
};

/**
 * The stack a pull request belongs to: the open pull requests it builds on,
 * down to the one merging into a branch no pull request comes from, and the
 * ones built on it.
 *
 * Going up, the stack stops where two pull requests build on the same one:
 * that is a tree, and which branch continues the stack is anyone's guess.
 */
export async function getPullRequestStack(
  pullRequest: PullRequest,
): Promise<PullRequestStack> {
  // A pull request merging into its own descendant would loop forever.
  const seen = new Set<string>([pullRequest.id]);

  const below: PullRequest[] = [];
  let bottom = pullRequest;
  while (bottom.baseRef && below.length < MAX_STACK_DEPTH) {
    const parent = await findOpenPullRequestByHead(bottom, bottom.baseRef);
    if (!parent || seen.has(parent.id)) {
      break;
    }
    seen.add(parent.id);
    below.push(parent);
    bottom = parent;
  }

  const above: PullRequest[] = [];
  let top = pullRequest;
  while (above.length < MAX_STACK_DEPTH) {
    const children = await findOpenChildPullRequests(top);
    const child = children.length === 1 ? children[0] : null;
    if (!child || seen.has(child.id)) {
      break;
    }
    seen.add(child.id);
    above.unshift(child);
    top = child;
  }

  return {
    pullRequests: [...above, pullRequest, ...below],
    baseBranch: bottom.baseRef,
  };
}

/**
 * The latest build of the same suite as `build` for each pull request, keyed
 * by pull request id. Pull requests the suite never ran on are left out.
 */
export async function getLatestPullRequestBuilds(args: {
  build: Build;
  pullRequests: PullRequest[];
}): Promise<Map<string, Build>> {
  const { build, pullRequests } = args;
  const column =
    pullRequests[0] instanceof OriginPullRequest
      ? "originPullRequestId"
      : "githubPullRequestId";
  const builds = await Build.query()
    .where("projectId", build.projectId)
    .where("name", build.name)
    .where("mode", "ci")
    .where("mergeQueue", false)
    .whereIn(
      column,
      pullRequests.map((pullRequest) => pullRequest.id),
    )
    .distinctOn(column)
    .orderBy(column)
    .orderBy("id", "desc");
  return new Map(
    builds.map((latest) => {
      const pullRequestId = latest[column];
      invariant(pullRequestId, "Build has no pull request");
      return [pullRequestId, latest];
    }),
  );
}
