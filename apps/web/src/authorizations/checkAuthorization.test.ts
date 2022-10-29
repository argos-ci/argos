import { jest } from "@jest/globals";

import { CONSISTENT, INVALID_TOKEN } from "./authorizationStatuses.js";
import { checkAuthorization } from "./checkAuthorization.js";
import { githubClient } from "./githubClient.js";
import { notFoundToken, validToken } from "./githubClientFixtures.js";

describe("checkAuthorization", () => {
  describe('with a "Not found error" (code: 404)', () => {
    beforeEach(() => {
      // @ts-ignore
      githubClient.apps.checkToken = jest.fn(notFoundToken());
    });

    it("should return status: INVALID_TOKEN with a 404 error", async () => {
      const result = await checkAuthorization({
        accessToken: "xxx",
        privateSync: true,
      });

      expect(result).toEqual({ status: INVALID_TOKEN });
    });
  });

  describe("with a valid response", () => {
    beforeEach(() => {
      // @ts-ignore
      githubClient.apps.checkToken = jest.fn(
        validToken({
          scopes: ["read:org", "repo:status", "user:email"],
        })
      );
    });

    it("should return status: CONSISTENT with scopes", async () => {
      const result = await checkAuthorization({
        accessToken: "xxx",
        privateSync: false,
      });

      expect(result).toEqual({
        status: CONSISTENT,
        scopes: ["read:org", "repo:status", "user:email"],
      });
    });
  });
});
