import { GraphQLError } from "graphql";

export class APIError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "APIError";
    Error.captureStackTrace(this, APIError);
  }
}

export const forbidden = () => {
  return new GraphQLError("Forbidden", {
    extensions: {
      code: "FORBIDDEN",
    },
  });
};

export const unauthenticated = () => {
  return new GraphQLError("unauthenticated", {
    extensions: {
      code: "UNAUTHENTICATED",
    },
  });
};
