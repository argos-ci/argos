import type { OriginPullRequest } from "@/database/models";
import logger from "@/logger";
import { getInstallationOriginApi } from "@/origin/client";

import { fetchOriginPullRequest, parseOriginPullRequestData } from "./remote";

/**
 * Fetch the pull request from Origin and update the database.
 */
export async function processOriginPullRequest(pullRequest: OriginPullRequest) {
  const { originRepository } = await pullRequest.$fetchGraph(
    "originRepository.installation",
  );
  const { installation } = originRepository;

  if (!installation || installation.deleted) {
    logger.info(
      { originRepositoryId: pullRequest.originRepositoryId },
      "No active Origin installation found for repository",
    );
    return;
  }

  const api = await getInstallationOriginApi(installation);

  if (!api) {
    logger.info(
      { installationId: installation.id },
      "Failed to authenticate the Origin installation",
    );
    return;
  }

  const data = await fetchOriginPullRequest(api, {
    owner: originRepository.ownerSlug,
    repo: originRepository.name,
    number: pullRequest.number,
  });

  if (!data) {
    return;
  }

  await pullRequest.$clone().$query().patch(parseOriginPullRequestData(data));
}
