import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { getProjectMemberIds } from "./members";

describe("getProjectMemberIds", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("returns only the owner for a personal project", async () => {
    const userAccount = await factory.UserAccount.create();
    invariant(userAccount.userId);
    const project = await factory.Project.create({
      accountId: userAccount.id,
    });

    const userIds = await getProjectMemberIds(project);
    expect(userIds).toEqual([userAccount.userId]);
  });

  it("includes team owners and members but not bare contributors", async () => {
    const teamAccount = await factory.TeamAccount.create();
    invariant(teamAccount.teamId);
    const project = await factory.Project.create({ accountId: teamAccount.id });
    const [owner, member, contributor] = await Promise.all([
      factory.User.create(),
      factory.User.create(),
      factory.User.create(),
    ]);
    await Promise.all([
      factory.TeamUser.create({
        teamId: teamAccount.teamId,
        userId: owner.id,
        userLevel: "owner",
      }),
      factory.TeamUser.create({
        teamId: teamAccount.teamId,
        userId: member.id,
        userLevel: "member",
      }),
      factory.TeamUser.create({
        teamId: teamAccount.teamId,
        userId: contributor.id,
        userLevel: "contributor",
      }),
    ]);

    const userIds = await getProjectMemberIds(project);
    expect([...userIds].sort()).toEqual([owner.id, member.id].sort());
  });

  it("includes contributors that have explicit project access", async () => {
    const teamAccount = await factory.TeamAccount.create();
    invariant(teamAccount.teamId);
    const project = await factory.Project.create({ accountId: teamAccount.id });
    const contributor = await factory.User.create();
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: contributor.id,
      userLevel: "contributor",
    });
    await factory.ProjectUser.create({
      projectId: project.id,
      userId: contributor.id,
      userLevel: "viewer",
    });

    const userIds = await getProjectMemberIds(project);
    expect(userIds).toEqual([contributor.id]);
  });
});
