import type { Octokit, RestEndpointMethodTypes } from "@octokit/rest";

import logger from "@/logger";

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
  try {
    await octokit.repos.createDispatchEvent(params);
  } catch (error) {
    // The repository is no longer accessible (deleted, transferred, renamed).
    if (checkOctokitErrorStatus(404, error)) {
      return;
    }

    // The repository is archived or the installation has no permission.
    if (checkOctokitErrorStatus(403, error)) {
      return;
    }

    logger.warn(
      { error, owner: params.owner, repo: params.repo },
      "Failed to create GitHub repository dispatch event",
    );
  }
}
