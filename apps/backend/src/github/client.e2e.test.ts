import { invariant } from "@argos/util/invariant";
import { RequestError } from "@octokit/request-error";
import { Octokit } from "@octokit/rest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GithubInstallation } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { sendNotification } from "@/notification";
import { HTTPError } from "@/util/error";

import { getInstallationOctokit } from "./client";

vi.mock("@/notification", () => ({
  sendNotification: vi.fn(),
}));

const mockSendNotification = vi.mocked(sendNotification);

const IP_ALLOW_LIST_MESSAGE =
  "Although you appear to have the correct authorization credentials, the `acme` organization has an IP allow list enabled, and your IP address is not permitted to access this resource. - https://docs.github.com/rest/reference/apps#create-an-installation-access-token-for-an-app";

/**
 * An app Octokit whose installation token request is answered by `auth`, the
 * only call `getInstallationOctokit` makes with it.
 */
function createAppOctokit(auth: () => Promise<unknown>) {
  return new Octokit({
    authStrategy: () => Object.assign(auth, { hook: vi.fn() }),
  });
}

const refusedByIpAllowList = createAppOctokit(async () => {
  throw new RequestError(IP_ALLOW_LIST_MESSAGE, 403, {
    request: {
      method: "POST",
      url: "https://api.github.com/app/installations/1/access_tokens",
      headers: {},
    },
  });
});

const authenticated = createAppOctokit(async () => ({
  token: "ghs_token",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
}));

async function seedBlockedProject() {
  const teamAccount = await factory.TeamAccount.create();
  invariant(teamAccount.teamId, "team account has no team");
  const owner = await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userLevel: "owner",
  });
  await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userLevel: "member",
  });
  const installation = await factory.GithubInstallation.create();
  const repoInstallation = await factory.GithubRepositoryInstallation.create({
    githubInstallationId: installation.id,
  });
  const project = await factory.Project.create({
    name: "web",
    accountId: teamAccount.id,
    githubRepositoryId: repoInstallation.githubRepositoryId,
  });
  return { teamAccount, owner, installation, project };
}

async function getIpAllowListError(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (error: unknown) => error,
  );
  invariant(error instanceof HTTPError, "Expected an HTTPError");
  return error;
}

describe("getInstallationOctokit", () => {
  beforeEach(async () => {
    await setupDatabase();
    vi.clearAllMocks();
  });

  it("throws a coded error and emails the owners once when an IP allow list blocks Argos", async () => {
    const { teamAccount, owner, installation } = await seedBlockedProject();

    const error = await getIpAllowListError(
      getInstallationOctokit(installation, refusedByIpAllowList),
    );
    expect(error.code).toBe("GITHUB_IP_ALLOW_LIST");
    expect(error.statusCode).toBe(403);
    expect(error.message).toContain('"acme" GitHub organization');

    const flagged = await GithubInstallation.query().findById(installation.id);
    expect(flagged?.ipAllowListBlockedAt).not.toBeNull();

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockSendNotification).toHaveBeenCalledWith({
      type: "github_ip_allow_list",
      data: {
        githubOwner: { name: "acme", kind: "organization" },
        projects: [
          {
            name: "web",
            url: expect.stringContaining(`/${teamAccount.slug}/web`),
          },
        ],
      },
      recipients: [owner.userId],
    });

    // Every job hitting the same wall must not email again.
    await getIpAllowListError(
      getInstallationOctokit(installation, refusedByIpAllowList),
    );
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it("clears the flag once GitHub issues a token again", async () => {
    const { installation } = await seedBlockedProject();

    await getIpAllowListError(
      getInstallationOctokit(installation, refusedByIpAllowList),
    );
    const octokit = await getInstallationOctokit(installation, authenticated);
    expect(octokit).not.toBeNull();

    const cleared = await GithubInstallation.query().findById(installation.id);
    expect(cleared?.ipAllowListBlockedAt).toBeNull();
  });
});
