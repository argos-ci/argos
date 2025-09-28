import { CombinedGraphQLErrors } from "@apollo/client";
import type { ErrorCode } from "@argos/error-types";

export const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

/**
 * Check if the given error is an ApolloError with the specified error code.
 */
export function checkIsErrorCode(error: unknown, code: ErrorCode) {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors.some((error) => {
      return error.extensions?.argosErrorCode === code;
    });
  }
  return false;
}

/**
 * Get a user-friendly error message from an ApolloError.
 */
export function getErrorMessage(error: unknown): string {
  if (CombinedGraphQLErrors.is(error) && error.errors[0]) {
    return error.errors[0].message ?? DEFAULT_ERROR_MESSAGE;
  }

  return DEFAULT_ERROR_MESSAGE;
}
