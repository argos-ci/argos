import { PRIVATE_SCOPES, PUBLIC_SCOPES, expandScopes } from "./scopes.js";

describe("expandScopes", () => {
  it("should expand scopes", () => {
    expect(expandScopes(PUBLIC_SCOPES)).toEqual([
      "user:email",
      "repo:status",
      "read:org",
    ]);
    expect(expandScopes(PRIVATE_SCOPES)).toEqual([
      "user:email",
      "repo",
      "repo:status",
      "read:org",
    ]);
  });
});
