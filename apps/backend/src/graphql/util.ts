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

export function badUserInput(message: string, options?: { field?: string }) {
  const extensions: { code: string; field?: string } = {
    code: "BAD_USER_INPUT",
  };
  if (options?.field) {
    extensions["field"] = options.field;
  }
  return new GraphQLError(message, {
    extensions,
  });
}
