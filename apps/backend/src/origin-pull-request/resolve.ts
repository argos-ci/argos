import type { OriginRepository } from "@/database/models";
import logger from "@/logger";
import { getInstallationOriginApi } from "@/origin";

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
    return pullRequests[0]?.number ?? null;
  } catch (error) {
    logger.warn(
      { error, originRepositoryId: repository.id, branch },
      "Failed to resolve the Origin pull request of a branch",
    );
    return null;
  }
}
