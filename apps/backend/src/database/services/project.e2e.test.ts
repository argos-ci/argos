import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { HTTPError } from "@/util/error";

import { createProject } from "./project";

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

    await expectHttpError(
      createProject({
        account: teamAccount,
        user: memberAccount.user,
        name: "no-permission",
      }),
      403,
    );

    await expect(
      Project.query().findOne({ accountId: teamAccount.id }),
    ).resolves.toBeUndefined();
  });

  it("throws 400 when the name contains invalid characters", async () => {
    const { teamAccount, user } = await createTeamOwner();

    await expectHttpError(
      createProject({ account: teamAccount, user, name: "has spaces" }),
      400,
    );

    await expect(
      Project.query().findOne({ accountId: teamAccount.id }),
    ).resolves.toBeUndefined();
  });

  it("throws 400 when the name is reserved", async () => {
    const { teamAccount, user } = await createTeamOwner();

    const error = await expectHttpError(
      createProject({ account: teamAccount, user, name: "settings" }),
      400,
    );
    expect(error.message).toBe("Name is reserved for internal usage");
  });

  it("throws 400 when the name is already used (case-insensitive)", async () => {
    const { teamAccount, user } = await createTeamOwner();
    await factory.Project.create({ accountId: teamAccount.id, name: "web" });

    const error = await expectHttpError(
      createProject({ account: teamAccount, user, name: "WEB" }),
      400,
    );
    expect(error.message).toBe("Name is already used by another project");
  });
});
