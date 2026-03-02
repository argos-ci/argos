import { CombinedGraphQLErrors } from "@apollo/client";
import type { ErrorCode } from "@argos/error-types";

import { APIError } from "./api";

export const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

/**
 * Get a single error code from an error.
 * In GraphQL multiple errors can be thrown, in this case we return null.
 */
export function getSingleErrorCode(error: unknown): ErrorCode | null {
  if (error instanceof APIError && error.code) {
    return error.code;
  }

  if (CombinedGraphQLErrors.is(error)) {
    const singleError = error.errors.length === 1 ? error.errors[0] : null;
    if (typeof singleError?.extensions?.argosErrorCode === "string") {
      return singleError.extensions.argosErrorCode as ErrorCode;
    }
  }

  return null;
}

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
