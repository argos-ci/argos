import { Gitlab } from "@gitbeaker/rest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { factory, setupDatabase } from "@/database/testing";
import { sendNotification } from "@/notification";

import { getGitlabClientFromAccount } from "./client";

vi.mock("@/notification", () => ({
  sendNotification: vi.fn(),
}));

vi.mock("@gitbeaker/rest", () => ({
  Gitlab: vi.fn(),
}));

const mockSendNotification = vi.mocked(sendNotification);
const mockGitlab = vi.mocked(Gitlab);

/**
 * Make `new Gitlab(...)` return a client whose `PersonalAccessTokens.show()`
 * rejects, simulating an invalid/expired token.
 */
function mockInvalidToken() {
  // Use a regular function (not an arrow) so it can be invoked with `new`.
  mockGitlab.mockImplementation(function () {
    return {
      PersonalAccessTokens: {
        show: vi.fn().mockRejectedValue(new Error("Unauthorized")),
      },
    } as unknown as InstanceType<typeof Gitlab>;
  });
}

describe("getGitlabClientFromAccount", () => {
  beforeEach(async () => {
    await setupDatabase();
    vi.clearAllMocks();
  });

  it("notifies the owners when the token is invalid in headless mode", async () => {
    mockInvalidToken();
    const account = await factory.UserAccount.create({
      gitlabAccessToken: "invalid-token",
      gitlabBaseUrl: null,
    });

    const client = await getGitlabClientFromAccount(account, {
      mode: "headless",
    });

    expect(client).toBeNull();
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "invalid_gitlab_token",
        recipients: [account.userId],
      }),
    );
  });

  it("does not notify the owners when the token is invalid in manual mode", async () => {
    mockInvalidToken();
    const account = await factory.UserAccount.create({
      gitlabAccessToken: "invalid-token",
      gitlabBaseUrl: null,
    });

    const client = await getGitlabClientFromAccount(account, {
      mode: "manual",
    });

    expect(client).toBeNull();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});
