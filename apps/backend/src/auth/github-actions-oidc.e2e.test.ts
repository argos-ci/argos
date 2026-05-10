import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import config from "@/config";
import { setupRedis } from "@/util/redis/testing";

import { verifyGitHubActionsOidcToken } from "./github-actions-oidc";
import {
  githubActionsOidcServer,
  signGitHubActionsToken,
} from "./github-actions-oidc.test-util";

setupRedis();

beforeAll(() => {
  githubActionsOidcServer.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  githubActionsOidcServer.resetHandlers();
});

afterAll(() => {
  githubActionsOidcServer.close();
});

describe("verifyGitHubActionsOidcToken", () => {
  test("verifies GitHub Actions OIDC claims", async () => {
    const claims = await verifyGitHubActionsOidcToken(signGitHubActionsToken());

    expect(claims).toMatchObject({
      aud: config.get("api.baseUrl"),
      iss: "https://token.actions.githubusercontent.com",
      repository: "argos-ci/argos",
      repository_id: "123",
      sha: "b6bf264029c03888b7fb7e6db7386f3b245b77b0",
    });
  });

  test("rejects a token with the wrong audience", async () => {
    await expect(
      verifyGitHubActionsOidcToken(
        signGitHubActionsToken({ audience: "https://example.com" }),
      ),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid GitHub Actions OIDC token.",
    });
  });
});
