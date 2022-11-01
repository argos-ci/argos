import { jest } from "@jest/globals";

import { getUserAuthorizationState } from "./getUserAuthorizationState.js";
import { githubClient } from "./githubClient.js";
import { notFoundToken, validToken } from "./githubClientFixtures.js";
import { PRIVATE_SCOPES, PUBLIC_SCOPES } from "./scopes.js";

// jest.mock("./githubClient");

describe("getUserAuthorizationState", () => {
  describe("without a valid token", () => {
    beforeEach(() => {
      // @ts-ignore
      githubClient.apps.checkToken = jest.fn(notFoundToken());
    });

    it("should throw an error", async () => {
      expect.assertions(1);
      try {
        await getUserAuthorizationState({
          accessToken: "a",
          privateSync: true,
        });
      } catch (error: any) {
        expect(error.message).toBe("Access token is invalid");
      }
    });
  });

  describe("with a consistent token", () => {
    beforeEach(() => {
      // @ts-ignore
      githubClient.apps.checkToken = jest.fn(
        validToken({
          scopes: PRIVATE_SCOPES,
        })
      );
    });

    it("should return token and githubScopes", async () => {
      const result = await getUserAuthorizationState({
        accessToken: "a",
        privateSync: true,
      });
      expect(result).toEqual({
        accessToken: "a",
        githubScopes: PRIVATE_SCOPES,
      });
    });
  });

  describe("with an inconsistent token", () => {
    beforeEach(() => {
      // @ts-ignore
      githubClient.apps.checkToken = jest.fn(
        validToken({
          scopes: PUBLIC_SCOPES,
        })
      );
    });

    describe("without previousAccessToken", () => {
      it("should return token and githubScopes", async () => {
        const result = await getUserAuthorizationState({
          accessToken: "a",
          privateSync: true,
        });
        expect(result).toEqual({
          accessToken: "a",
          githubScopes: PUBLIC_SCOPES,
        });
      });
    });

    describe("with a consistent previousToken", () => {
      beforeEach(() => {
        // @ts-ignore
        githubClient.apps.checkToken = jest.fn(
          validToken({
            scopes: PRIVATE_SCOPES,
          })
        );
      });

      it("should return githubScopes", async () => {
        const result = await getUserAuthorizationState({
          accessToken: "a",
          privateSync: true,
          previousAccessToken: "b",
        });
        expect(result).toEqual({
          accessToken: "a",
          githubScopes: PRIVATE_SCOPES,
        });
      });
    });

    describe("with an inconsistent previousToken", () => {
      beforeEach(() => {
        // @ts-ignore
        githubClient.apps.checkToken = jest.fn(
          validToken({
            scopes: PUBLIC_SCOPES,
          })
        );
      });

      it("should return accessToken and githubScopes", async () => {
        const result = await getUserAuthorizationState({
          accessToken: "a",
          privateSync: true,
          previousAccessToken: "b",
        });
        expect(result).toEqual({
          accessToken: "a",
          githubScopes: PUBLIC_SCOPES,
        });
      });
    });

    describe("with an invalid previousToken", () => {
      beforeEach(() => {
        // @ts-ignore
        githubClient.apps.checkToken = jest.fn((token: string) => {
          if (token === "a") {
            return notFoundToken()();
          }
          return validToken({
            scopes: PUBLIC_SCOPES,
          })();
        });
      });

      it("should return accessToken and githubScopes", async () => {
        const result = await getUserAuthorizationState({
          accessToken: "a",
          privateSync: true,
          previousAccessToken: "b",
        });
        expect(result).toEqual({
          accessToken: "a",
          githubScopes: PUBLIC_SCOPES,
        });
      });
    });
  });
});
