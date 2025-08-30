import { ApolloError } from "@apollo/client";

export const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

/**
 * Get a user-friendly error message from an ApolloError.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApolloError && error.graphQLErrors[0]) {
    return error.graphQLErrors[0].message ?? DEFAULT_ERROR_MESSAGE;
  }

  return DEFAULT_ERROR_MESSAGE;
}
