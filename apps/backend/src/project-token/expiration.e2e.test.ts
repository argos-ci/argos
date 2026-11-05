import { addDays } from "@argos/util/date";
import { invariant } from "@argos/util/invariant";
import { test as base, describe, expect } from "vitest";

import {
  NotificationWorkflow,
  ProjectToken,
  type Account,
  type Project,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { warnExpiringProjectTokens } from "./expiration";

async function getWarnings() {
  return NotificationWorkflow.query()
    .where("type", "project_token_expiration")
    .withGraphFetched("recipients");
}

const test = base.extend<{
  team: { account: Account; ownerId: string; web: Project; docs: Project };
  personalAccount: Account;
}>({
  team: async ({}, use) => {
    await setupDatabase();
    const account = await factory.TeamAccount.create();
    invariant(account.teamId, "team account has no team");
    const [owner, member] = await factory.User.createMany(2);
    invariant(owner && member);
    await factory.TeamUser.createMany(2, [
      { teamId: account.teamId, userId: owner.id, userLevel: "owner" },
      { teamId: account.teamId, userId: member.id, userLevel: "member" },
    ]);
    const [web, docs] = await Promise.all([
      factory.Project.create({ accountId: account.id, name: "web" }),
      factory.Project.create({ accountId: account.id, name: "docs" }),
    ]);
    invariant(web && docs);
    await use({ account, ownerId: owner.id, web, docs });
  },
  personalAccount: async ({}, use) => {
    await setupDatabase();
    await use(await factory.UserAccount.create());
  },
});

describe("warnExpiringProjectTokens", () => {
  test("warns the team owners once about a token expiring soon", async ({
    team,
  }) => {
    const now = new Date();
    const { web, docs } = team;
    const expireAt = addDays(now, 3).toISOString();
    const { projectToken: expiringSoon } = await factory.createProjectToken({
      projects: [web, docs],
      expireAt,
    });
    await Promise.all([
      factory.createProjectToken({
        projects: [web],
        expireAt: addDays(now, 30).toISOString(),
      }),
      factory.createProjectToken({
        projects: [web],
        expireAt: addDays(now, -1).toISOString(),
      }),
      factory.createProjectToken({ projects: [web], expireAt: null }),
    ]);

    // Two runs racing, then a later one.
    await Promise.all([
      warnExpiringProjectTokens(now),
      warnExpiringProjectTokens(now),
    ]);
    await warnExpiringProjectTokens(addDays(now, 1));

    const warnings = await getWarnings();
    expect(warnings).toHaveLength(1);
    const [warning] = warnings;
    invariant(warning?.recipients);
    expect(warning.data).toEqual({
      accountSlug: team.account.slug,
      tokenName: expiringSoon.name,
      projectNames: ["docs", "web"],
      expireAt,
    });
    expect(warning.recipients.map((recipient) => recipient.userId)).toEqual([
      team.ownerId,
    ]);

    const warned = await ProjectToken.query()
      .whereNotNull("expiryWarnedAt")
      .select("id");
    expect(warned.map((token) => token.id)).toEqual([expiringSoon.id]);
  });

  test("warns the owner of a personal account", async ({
    personalAccount: account,
  }) => {
    const now = new Date();
    invariant(account.userId, "user account has no user");
    const project = await factory.Project.create({ accountId: account.id });
    await factory.createProjectToken({
      projects: [project],
      expireAt: addDays(now, 6).toISOString(),
    });

    await warnExpiringProjectTokens(now);

    const warnings = await getWarnings();
    expect(warnings).toHaveLength(1);
    const [warning] = warnings;
    invariant(warning?.recipients);
    expect(warning.recipients.map((recipient) => recipient.userId)).toEqual([
      account.userId,
    ]);
  });
});
