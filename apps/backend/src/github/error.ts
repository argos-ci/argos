import { RequestError } from "@octokit/request-error";

/**
 * Get the status code from an Octokit RequestError.
 */
function getOctokitErrorStatus(error: unknown) {
  if (error instanceof RequestError) {
    return error.status;
  }
  return null;
}

/**
 * Check the status code from an Octokit RequestError.
 */
export function checkOctokitErrorStatus(
  status: number,
  error: unknown,
): error is RequestError {
  return getOctokitErrorStatus(error) === status;
}

/**
 * Check if GitHub failed to answer: a 5xx, or a network error, which Octokit
 * reports as a 500.
 */
export function checkIsOctokitServerError(
  error: unknown,
): error is RequestError {
  const status = getOctokitErrorStatus(error);
  return status !== null && status >= 500;
}
