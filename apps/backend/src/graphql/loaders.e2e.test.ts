import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { createLoaders } from "./loaders";

describe("ProjectTeamUserLevel loader", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  async function createTeamProjectWithMember(userLevel: "owner" | "member") {
    const account = await factory.TeamAccount.create();
    invariant(account.teamId);
    const project = await factory.Project.create({ accountId: account.id });
    const user = await factory.User.create();
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: user.id,
      userLevel,
    });
    return { account, project, user };
  }

  it("resolves the role for a team member", async () => {
    const { account, project, user } =
      await createTeamProjectWithMember("member");
    const loaders = createLoaders();
    const level = await loaders.ProjectTeamUserLevel.load({
      accountSlug: account.slug,
      projectName: project.name,
      userId: user.id,
    });
    expect(level).toBe("member");
  });

  it("returns null for a user that is not a team member", async () => {
    const { account, project } = await createTeamProjectWithMember("member");
    const outsider = await factory.User.create();
    const loaders = createLoaders();
    const level = await loaders.ProjectTeamUserLevel.load({
      accountSlug: account.slug,
      projectName: project.name,
      userId: outsider.id,
    });
    expect(level).toBeNull();
  });

  it("returns null when the project does not exist", async () => {
    const { account, user } = await createTeamProjectWithMember("member");
    const loaders = createLoaders();
    const level = await loaders.ProjectTeamUserLevel.load({
      accountSlug: account.slug,
      projectName: "does-not-exist",
      userId: user.id,
    });
    expect(level).toBeNull();
  });

  it("resolves a batch spanning multiple distinct projects correctly", async () => {
    const a = await createTeamProjectWithMember("owner");
    const b = await createTeamProjectWithMember("member");
    const loaders = createLoaders();
    // Loaded in the same tick so the DataLoader batches them together — the
    // composite (accountId, name) lookup must keep each project's team separate.
    const [levelA, levelB, crossed] = await Promise.all([
      loaders.ProjectTeamUserLevel.load({
        accountSlug: a.account.slug,
        projectName: a.project.name,
        userId: a.user.id,
      }),
      loaders.ProjectTeamUserLevel.load({
        accountSlug: b.account.slug,
        projectName: b.project.name,
        userId: b.user.id,
      }),
      // A's user against B's project must not resolve.
      loaders.ProjectTeamUserLevel.load({
        accountSlug: b.account.slug,
        projectName: b.project.name,
        userId: a.user.id,
      }),
    ]);
    expect(levelA).toBe("owner");
    expect(levelB).toBe("member");
    expect(crossed).toBeNull();
  });
});
