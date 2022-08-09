import { PRIVATE_SCOPES, PUBLIC_SCOPES } from "./scopes";
import { githubClient } from "./githubClient";
import { getUserAuthorizationState } from "./getUserAuthorizationState";
import { notFoundToken, validToken } from "./githubClientFixtures";

jest.mock("./githubClient");

describe("getUserAuthorizationState", () => {
  describe("without a valid token", () => {
    beforeEach(() => {
      githubClient.apps.checkToken.mockImplementation(notFoundToken());
    });

    it("should throw an error", async () => {
      expect.assertions(1);
      try {
        await getUserAuthorizationState({
          accessToken: "a",
          privateSync: true,
          previousAccessToken: null,
        });
      } catch (error) {
        expect(error.message).toBe("Access token is invalid");
      }
    });
  });

  describe("with a consistent token", () => {
    beforeEach(() => {
      githubClient.apps.checkToken.mockImplementation(
        validToken({
          scopes: PRIVATE_SCOPES,
        })
      );
    });

    it("should return token and githubScopes", async () => {
      const result = await getUserAuthorizationState({
        accessToken: "a",
        privateSync: true,
        previousAccessToken: null,
      });
      expect(result).toEqual({
        accessToken: "a",
        githubScopes: PRIVATE_SCOPES,
      });
    });
  });

  describe("with an inconsistent token", () => {
    beforeEach(() => {
      githubClient.apps.checkToken.mockImplementationOnce(
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
          previousAccessToken: null,
        });
        expect(result).toEqual({
          accessToken: "a",
          githubScopes: PUBLIC_SCOPES,
        });
      });
    });

    describe("with a consistent previousToken", () => {
      beforeEach(() => {
        githubClient.apps.checkToken.mockImplementationOnce(
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
        expect(result).toEqual({ githubScopes: PRIVATE_SCOPES });
      });
    });

    describe("with an inconsistent previousToken", () => {
      beforeEach(() => {
        githubClient.apps.checkToken.mockImplementationOnce(
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
        githubClient.apps.checkToken.mockImplementationOnce(notFoundToken());
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
