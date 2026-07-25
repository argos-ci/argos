import type { ErrorCode } from "@argos/error-types";
import { GraphQLError } from "graphql";

import { HTTPError } from "@/util/error";

export function forbidden(message: string = "Forbidden") {
  return new GraphQLError(message, {
    extensions: {
      code: "FORBIDDEN",
    },
  });
}

export function notFound(message: string) {
  return new GraphQLError(message, {
    extensions: {
      code: "NOT_FOUND",
    },
  });
}

export function unauthenticated(message: string = "Unauthenticated") {
  return new GraphQLError(message, {
    extensions: {
      code: "UNAUTHENTICATED",
    },
  });
}

export function badUserInput(
  message: string,
  options?: { field?: string | string[]; code?: ErrorCode },
) {
  const extensions: {
    code: string;
    argosErrorCode?: ErrorCode;
    field?: string | string[];
  } = {
    code: "BAD_USER_INPUT",
  };
  if (options?.field) {
    extensions["field"] = options.field;
  }
  if (options?.code) {
    extensions["argosErrorCode"] = options.code;
  }
  return new GraphQLError(message, {
    extensions,
  });
}

export function invalidId() {
  throw badUserInput("Invalid ID");
}

/**
 * GraphQL error codes for the HTTP statuses that carry a meaning of their own.
 * Any other client error falls back to `BAD_USER_INPUT`.
 */
const GRAPHQL_CODE_BY_STATUS: Record<number, string> = {
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
};

/**
 * Translate an `HTTPError` raised by a shared service into the GraphQL error
 * matching its status code, and return anything else untouched.
 *
 * Services throw `HTTPError`, which Apollo reports as INTERNAL_SERVER_ERROR:
 * without this, every pasted typo or missing record would page the team through
 * Sentry. Server errors (5xx) are left alone on purpose — those are the ones
 * worth paging for.
 *
 * Meant to be used as `throw toGraphQLError(error)` in a resolver's `catch`.
 * Handle the cases needing a `field` extension before calling it.
 */
export function toGraphQLError(error: unknown): unknown {
  if (!(error instanceof HTTPError)) {
    return error;
  }

  const { statusCode } = error;

  if (statusCode < 400 || statusCode >= 500) {
    return error;
  }

  const code = GRAPHQL_CODE_BY_STATUS[statusCode] ?? "BAD_USER_INPUT";
  const extensions: { code: string; argosErrorCode?: ErrorCode } = { code };

  // The Sentry plugin copies this over from `originalError`, which no longer
  // holds the HTTPError once it is converted.
  if (error.code) {
    extensions.argosErrorCode = error.code;
  }

  return new GraphQLError(error.message, { extensions });
}
