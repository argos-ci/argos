import type { OriginPullRequest } from "@/database/models";
import { unretryable } from "@/job-core/error";
import logger from "@/logger";
import { getInstallationOriginApi } from "@/origin";

import { fetchOriginPullRequest, parseOriginPullRequestData } from "./remote";

/**
 * Fetch the pull request from Origin and update the database.
 */
export async function processOriginPullRequest(pullRequest: OriginPullRequest) {
  await pullRequest.$fetchGraph("originRepository.installation");

  unretryable(
    pullRequest.originRepository,
    "`originRepository` relation not found",
  );

  const { installation } = pullRequest.originRepository;

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
    owner: pullRequest.originRepository.ownerSlug,
    repo: pullRequest.originRepository.name,
    number: pullRequest.number,
  });

  if (!data) {
    return;
  }

  await pullRequest.$clone().$query().patch(parseOriginPullRequestData(data));
}
