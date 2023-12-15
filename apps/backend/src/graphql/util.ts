import { GraphQLError } from "graphql";

export const forbidden = (message: string = "Forbidden") => {
  return new GraphQLError(message, {
    extensions: {
      code: "FORBIDDEN",
    },
  });
};

export const notFound = (message: string) => {
  return new GraphQLError(message, {
    extensions: {
      code: "NOT_FOUND",
    },
  });
};

export const unauthenticated = (message: string = "Unauthenticated") => {
  return new GraphQLError(message, {
    extensions: {
      code: "UNAUTHENTICATED",
    },
  });
};
