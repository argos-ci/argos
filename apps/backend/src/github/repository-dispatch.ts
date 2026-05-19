import type { Octokit, RestEndpointMethodTypes } from "@octokit/rest";

import parentLogger from "@/logger";

import { checkOctokitErrorStatus } from "./error";

/**
 * Create a GitHub repository dispatch event.
 *
 * Requires `contents: write` permission, which is only granted to the
 * `main` GitHub App. Caller is responsible for checking the installation
 * before calling this helper.
 *
 * @see https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event
 */
export async function createGhRepositoryDispatch(
  octokit: Octokit,
  params: RestEndpointMethodTypes["repos"]["createDispatchEvent"]["parameters"],
) {
  const logger = parentLogger.child({
    category: "github.repository-dispatch",
    owner: params.owner,
    repo: params.repo,
    event_type: params.event_type,
  });

  logger.info("Creating GitHub repository dispatch event");

  try {
    await octokit.repos.createDispatchEvent(params);
    logger.info("Created GitHub repository dispatch event");
  } catch (error) {
    // The repository is no longer accessible (deleted, transferred, renamed).
    if (checkOctokitErrorStatus(404, error)) {
      logger.info(
        { error },
        "Skipped GitHub repository dispatch event (repository not found)",
      );
      return;
    }

    // The repository is archived or the installation has no permission.
    if (checkOctokitErrorStatus(403, error)) {
      logger.info(
        { error },
        "Skipped GitHub repository dispatch event (forbidden)",
      );
      return;
    }

    logger.warn({ error }, "Failed to create GitHub repository dispatch event");
  }
}
