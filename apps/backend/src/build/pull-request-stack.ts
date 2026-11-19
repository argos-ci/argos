import { invariant } from "@argos/util/invariant";

import { Build, GithubPullRequest, OriginPullRequest } from "@/database/models";

type PullRequest = GithubPullRequest | OriginPullRequest;

/**
 * How many pull requests a stack is followed through, in each direction. Each
 * one costs a query on every build page that shows the stack.
 */
const MAX_STACK_DEPTH = 20;

/**
 * The open pull request coming from `branch`, in the repository of
 * `pullRequest`.
 */
function findOpenPullRequestByHead(
  pullRequest: PullRequest,
  branch: string,
): Promise<PullRequest | null> {
  if (pullRequest instanceof GithubPullRequest) {
    return GithubPullRequest.findOpenByHead({
      githubRepositoryId: pullRequest.githubRepositoryId,
      branch,
    });
  }
  return OriginPullRequest.findOpenByHead({
    originRepositoryId: pullRequest.originRepositoryId,
    branch,
  });
}

/** The open pull request `pullRequest` merges into, when there is one. */
async function findParent(pullRequest: PullRequest) {
  if (!pullRequest.baseRef) {
    return null;
  }
  return findOpenPullRequestByHead(pullRequest, pullRequest.baseRef);
}

/**
 * The open pull request merging into `pullRequest`. Two or more make a tree
 * rather than a stack: which one continues it is anyone's guess, so there is
 * none.
 */
async function findChild(pullRequest: PullRequest) {
  const [child, other] = await findOpenChildren(pullRequest);
  return child && !other ? child : null;
}

/** Up to two of the open pull requests merging into `pullRequest`. */
async function findOpenChildren(
  pullRequest: PullRequest,
): Promise<PullRequest[]> {
  const { headRef } = pullRequest;
  if (!headRef) {
    return [];
  }
  if (pullRequest instanceof GithubPullRequest) {
    // A fork's branch is not one of the repository's: nothing merges into it.
    if (pullRequest.headFromFork !== false) {
      return [];
    }
    return GithubPullRequest.query()
      .where("githubRepositoryId", pullRequest.githubRepositoryId)
      .where("baseRef", headRef)
      .where("state", "open")
      .limit(2);
  }
  return OriginPullRequest.query()
    .where("originRepositoryId", pullRequest.originRepositoryId)
    .where("baseRef", headRef)
    .where("state", "open")
    .limit(2);
}

/**
 * The pull requests reached from `start` by repeatedly taking `next`, closest
 * first. Stops at a pull request already reached, which pull requests merging
 * into each other's branches would otherwise repeat until the depth limit.
 */
async function follow(
  start: PullRequest,
  next: (pullRequest: PullRequest) => Promise<PullRequest | null>,
): Promise<PullRequest[]> {
  const seen = new Set([start.id]);
  const chain: PullRequest[] = [];
  let current = start;
  while (chain.length < MAX_STACK_DEPTH) {
    const found = await next(current);
    if (!found || seen.has(found.id)) {
      break;
    }
    seen.add(found.id);
    chain.push(found);
    current = found;
  }
  return chain;
}

/**
 * Whether a build's pull request is stacked on another one: its base branch is
 * the head of another open pull request, and builds on it are not
 * auto-approved.
 */
export async function checkIsStackedPullRequest(args: {
  pullRequest: PullRequest | null;
  baseBranch: string | null;
  isAutoApprovedBranch: (branch: string) => boolean;
}): Promise<boolean> {
  const { pullRequest, baseBranch } = args;
  if (!pullRequest || !baseBranch || args.isAutoApprovedBranch(baseBranch)) {
    return false;
  }
  const parent = await findOpenPullRequestByHead(pullRequest, baseBranch);
  return parent !== null;
}

/**
 * The stack a pull request belongs to: the open pull requests it builds on,
 * down to the one merging into a branch no pull request comes from, and the
 * ones built on it. Null when the pull request is not stacked.
 */
export async function getPullRequestStack(pullRequest: PullRequest): Promise<{
  /** From the top of the stack down to the one merging into `baseBranch`. */
  pullRequests: PullRequest[];
  /** The branch the bottom pull request merges into. */
  baseBranch: string | null;
} | null> {
  const [below, above] = await Promise.all([
    follow(pullRequest, findParent),
    follow(pullRequest, findChild),
  ]);
  // In a loop of pull requests merging into each other, every one of them is
  // both above and below.
  const belowIds = new Set(below.map((item) => item.id));
  const pullRequests = [
    ...above.filter((item) => !belowIds.has(item.id)).reverse(),
    pullRequest,
    ...below,
  ];
  if (pullRequests.length < 2) {
    return null;
  }
  const bottom = below.at(-1) ?? pullRequest;
  return { pullRequests, baseBranch: bottom.baseRef };
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
  const column = build.originPullRequestId
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

/**
 * The stack of a build's pull request, each pull request with the latest
 * build of the same suite. Null when the pull request is not stacked.
 */
export async function getBuildPullRequestStack(args: {
  build: Build;
  pullRequest: PullRequest;
}) {
  const stack = await getPullRequestStack(args.pullRequest);
  if (!stack) {
    return null;
  }
  const builds = await getLatestPullRequestBuilds({
    build: args.build,
    pullRequests: stack.pullRequests,
  });
  return {
    baseBranch: stack.baseBranch,
    items: stack.pullRequests.map((pullRequest) => ({
      pullRequest,
      build: builds.get(pullRequest.id) ?? null,
    })),
  };
}
