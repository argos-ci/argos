import { RequestError } from "@octokit/request-error";

/**
 * Get the status code from an Octokit RequestError.
 */
export function getOctokitErrorStatus(error: unknown) {
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
