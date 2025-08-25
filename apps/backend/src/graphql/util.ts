import type { ErrorCode } from "@argos/error-types";
import { GraphQLError } from "graphql";

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
  options?: { field?: string; code?: ErrorCode },
) {
  const extensions: {
    code: string;
    argosErrorCode?: ErrorCode;
    field?: string;
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
