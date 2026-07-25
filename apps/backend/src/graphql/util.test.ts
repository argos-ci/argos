import { GraphQLError } from "graphql";
import { describe, expect, it } from "vitest";

import { boom } from "@/util/error";

import { toGraphQLError } from "./util";

describe("toGraphQLError", () => {
  it.each([
    [400, "BAD_USER_INPUT"],
    [401, "UNAUTHENTICATED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    // Any other client error is something the user has to fix.
    [409, "BAD_USER_INPUT"],
    [429, "BAD_USER_INPUT"],
  ])("converts a %i into %s", (statusCode, code) => {
    const error = toGraphQLError(boom(statusCode, "Nope"));
    expect(error).toBeInstanceOf(GraphQLError);
    expect((error as GraphQLError).message).toBe("Nope");
    expect((error as GraphQLError).extensions).toEqual({ code });
  });

  it("carries over the Argos error code", () => {
    const error = toGraphQLError(
      boom(403, "SSO required", { code: "SAML_SSO_REQUIRED" }),
    );
    expect((error as GraphQLError).extensions).toEqual({
      code: "FORBIDDEN",
      argosErrorCode: "SAML_SSO_REQUIRED",
    });
  });

  // Server errors are bugs or upstream outages: they must reach Sentry.
  it.each([500, 502])("leaves a %i untouched", (statusCode) => {
    const original = boom(statusCode, "Upstream is down");
    expect(toGraphQLError(original)).toBe(original);
  });

  it("leaves a non-HTTP error untouched", () => {
    const original = new Error("boom");
    expect(toGraphQLError(original)).toBe(original);
  });
});
