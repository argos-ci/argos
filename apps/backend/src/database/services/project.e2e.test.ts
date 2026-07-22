import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Account, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { notifyDiscord } from "@/discord";
import { HTTPError } from "@/util/error";

import { createProject, notifyProjectTransfer } from "./project";

// The Discord webhook is configured in the test env; stub it so creating a
// project here doesn't post a real notification.
vi.mock("@/discord", () => ({ notifyDiscord: vi.fn(() => Promise.resolve()) }));

/**
 * Create a team account with an owner (admin) user and its personal account.
 */
async function createTeamOwner() {
  const userAccount = await factory.UserAccount.create();
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");
  const user = userAccount.user;

  const teamAccount = await factory.TeamAccount.create();
  invariant(teamAccount.teamId, "team account has no team");
  await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userId: user.id,
    userLevel: "owner",
  });

  return { teamAccount, user };
}

/**
 * Await a rejected promise and assert it threw an {@link HTTPError} with the
 * given status code.
 */
async function expectHttpError(promise: Promise<unknown>, statusCode: number) {
  const error = await promise.then(
    () => {
      throw new Error("Expected the promise to reject, but it resolved.");
    },
    (error: unknown) => error,
  );
  expect(error).toBeInstanceOf(HTTPError);
  expect((error as HTTPError).statusCode).toBe(statusCode);
  return error as HTTPError;
}

describe("createProject service", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await setupDatabase();
  });

  it("creates a project owned by the account", async () => {
    const { teamAccount, user } = await createTeamOwner();

    const project = await createProject({
      account: teamAccount,
      user,
      name: "my-project",
    });

    expect(project).toMatchObject({
      name: "my-project",
      accountId: teamAccount.id,
    });
    await expect(Project.query().findById(project.id)).resolves.toMatchObject({
      name: "my-project",
      accountId: teamAccount.id,
    });
  });

  it("trims the name before creating the project", async () => {
    const { teamAccount, user } = await createTeamOwner();

    const project = await createProject({
      account: teamAccount,
      user,
      name: "  my-project  ",
    });

    expect(project.name).toBe("my-project");
  });

  it("notifies Discord when a team account creates a project", async () => {
    const { teamAccount, user } = await createTeamOwner();

    await createProject({ account: teamAccount, user, name: "my-project" });

    expect(vi.mocked(notifyDiscord)).toHaveBeenCalledOnce();
  });

  it("does not notify Discord when a personal account creates a project", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    invariant(userAccount.user, "user not fetched");

    await createProject({
      account: userAccount,
      user: userAccount.user,
      name: "my-project",
    });

    expect(vi.mocked(notifyDiscord)).not.toHaveBeenCalled();
  });

  it("throws 403 when the user is not an admin of the account", async () => {
    const { teamAccount } = await createTeamOwner();
    const memberAccount = await factory.UserAccount.create();
    await memberAccount.$fetchGraph("user");
    invariant(memberAccount.user, "user not fetched");
    await factory.TeamUser.create({
      teamId: teamAccount.teamId!,
      userId: memberAccount.user.id,
      userLevel: "member",
    });

    const error = await expectHttpError(
      createProject({
        account: teamAccount,
        user: memberAccount.user,
        name: "no-permission",
      }),
      403,
    );
    // A permission error is not a name problem, so it carries no name code.
    expect(error.code).toBeNull();

    await expect(
      Project.query().findOne({ accountId: teamAccount.id }),
    ).resolves.toBeUndefined();
  });

  it("throws 400 PROJECT_NAME_INVALID when the name contains invalid characters", async () => {
    const { teamAccount, user } = await createTeamOwner();

    const error = await expectHttpError(
      createProject({ account: teamAccount, user, name: "has spaces" }),
      400,
    );
    expect(error.code).toBe("PROJECT_NAME_INVALID");

    await expect(
      Project.query().findOne({ accountId: teamAccount.id }),
    ).resolves.toBeUndefined();
  });

  it("throws 400 PROJECT_NAME_INVALID when the name is reserved", async () => {
    const { teamAccount, user } = await createTeamOwner();

    const error = await expectHttpError(
      createProject({ account: teamAccount, user, name: "settings" }),
      400,
    );
    expect(error.message).toBe("Name is reserved for internal usage");
    expect(error.code).toBe("PROJECT_NAME_INVALID");
  });

  it("throws 400 PROJECT_NAME_INVALID when the name is already used (case-insensitive)", async () => {
    const { teamAccount, user } = await createTeamOwner();
    await factory.Project.create({ accountId: teamAccount.id, name: "web" });

    const error = await expectHttpError(
      createProject({ account: teamAccount, user, name: "WEB" }),
      400,
    );
    expect(error.message).toBe("Name is already used by another project");
    expect(error.code).toBe("PROJECT_NAME_INVALID");
  });
});

describe("notifyProjectTransfer service", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await setupDatabase();
  });

  /**
   * Transfer `project` between the two given accounts, keeping the arguments
   * the resolver would pass.
   */
  async function transfer(input: {
    previousAccount: Account;
    targetAccount: Account;
  }) {
    const project = await factory.Project.create({
      accountId: input.targetAccount.id,
      name: "shared-project",
    });

    await notifyProjectTransfer({
      project,
      previousAccount: input.previousAccount,
      previousName: "side-project",
      targetAccount: input.targetAccount,
      email: "jane@example.com",
    });
  }

  it("notifies when a project moves from a personal account to a team", async () => {
    await transfer({
      previousAccount: await factory.UserAccount.create(),
      targetAccount: await factory.TeamAccount.create(),
    });

    expect(vi.mocked(notifyDiscord)).toHaveBeenCalledOnce();
    // Both names are reported: a transfer can rename the project on the way.
    const { content } = vi.mocked(notifyDiscord).mock.calls[0]![0];
    expect(content).toContain("side-project");
    expect(content).toContain("shared-project");
    expect(content).toContain("jane@example.com");
  });

  it("stays silent when a project moves from a team to a personal account", async () => {
    await transfer({
      previousAccount: await factory.TeamAccount.create(),
      targetAccount: await factory.UserAccount.create(),
    });

    expect(vi.mocked(notifyDiscord)).not.toHaveBeenCalled();
  });

  it("stays silent when a project moves between two teams", async () => {
    await transfer({
      previousAccount: await factory.TeamAccount.create(),
      targetAccount: await factory.TeamAccount.create(),
    });

    expect(vi.mocked(notifyDiscord)).not.toHaveBeenCalled();
  });

  it("stays silent when a project moves between two personal accounts", async () => {
    await transfer({
      previousAccount: await factory.UserAccount.create(),
      targetAccount: await factory.UserAccount.create(),
    });

    expect(vi.mocked(notifyDiscord)).not.toHaveBeenCalled();
  });
});
