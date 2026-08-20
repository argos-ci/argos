import { OriginRepository } from "@/database/models";
import logger from "@/logger";
import { getInstallationOriginApi } from "@/origin/client";
import { redisCache } from "@/util/redis";

import { stripRefPrefix } from "./remote";

/**
 * Find the open pull request whose head is a branch.
 *
 * On GitHub, the CLI resolves the pull request from the CI context. Origin has
 * no CI of its own — builds come from Buildkite, Depot or a plain `git`
 * checkout that may not know the pull request — so Argos asks Origin when the
 * build only names a branch. Best effort: a failure here must not fail the
 * upload.
 */
export async function resolveOriginPullRequestNumber(input: {
  repository: OriginRepository;
  branch: string;
}): Promise<number | null> {
  return pullRequestNumberStore.get(input.repository.id, input.branch);
}

/**
 * Cached, because this runs on the build upload the CLI waits on: a monorepo
 * pushing several build names for one commit would otherwise pay the same
 * remote lookup once per build, and again on every run of the branch. Short
 * lived, so a pull request opened moments after the first build still gets
 * picked up by the next one.
 */
const pullRequestNumberStore = redisCache.createStore({
  maxAge: 60 * 1000,
  timeout: 15 * 1000,
  getCacheKey: (originRepositoryId: string, branch: string) => [
    "origin-branch-pull-request",
    originRepositoryId,
    branch,
  ],
  fetch: async (originRepositoryId: string, branch: string) => {
    const repository =
      await OriginRepository.query().findById(originRepositoryId);
    if (!repository) {
      return null;
    }
    return fetchOriginPullRequestNumber({ repository, branch });
  },
});

async function fetchOriginPullRequestNumber(input: {
  repository: OriginRepository;
  branch: string;
}): Promise<number | null> {
  const { repository, branch } = input;
  await repository.$fetchGraph("installation", { skipFetched: true });
  const { installation } = repository;
  if (!installation || installation.deleted) {
    return null;
  }
  try {
    const api = await getInstallationOriginApi(installation);
    if (!api) {
      return null;
    }
    const pullRequests = await api.listPullRequests(
      { owner: repository.ownerSlug, repo: repository.name },
      { head: branch, state: "open" },
    );
    // `head` is a server-side filter Origin may spell differently (its refs
    // come back fully qualified) or ignore altogether. Match the ref here so
    // an unfiltered list reads as "no pull request" rather than attaching the
    // build — and its comment and check run — to an unrelated one.
    const pullRequest = pullRequests.find(
      (pullRequest) => stripRefPrefix(pullRequest.head.ref) === branch,
    );
    return pullRequest?.number ?? null;
  } catch (error) {
    logger.warn(
      { error, originRepositoryId: repository.id, branch },
      "Failed to resolve the Origin pull request of a branch",
    );
    return null;
  }
}
