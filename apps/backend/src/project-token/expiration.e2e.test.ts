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

const DAY_MS = 24 * 60 * 60 * 1000;

function inDays(now: Date, days: number) {
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

async function getWarnings() {
  return NotificationWorkflow.query()
    .where("type", "project_token_expiration")
    .withGraphFetched("recipients");
}

const test = base.extend<{
  team: { account: Account; ownerId: string };
  projects: [Project, Project];
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
    await use({ account, ownerId: owner.id });
  },
  projects: async ({ team }, use) => {
    const [web, docs] = await Promise.all([
      factory.Project.create({ accountId: team.account.id, name: "web" }),
      factory.Project.create({ accountId: team.account.id, name: "docs" }),
    ]);
    invariant(web && docs);
    await use([web, docs]);
  },
  personalAccount: async ({}, use) => {
    await setupDatabase();
    await use(await factory.UserAccount.create());
  },
});

describe("warnExpiringProjectTokens", () => {
  test("warns the team owners once about a token expiring soon", async ({
    team,
    projects,
  }) => {
    const now = new Date();
    const [web, docs] = projects;
    const expireAt = inDays(now, 3);
    const { projectToken: expiringSoon } = await factory.createProjectToken({
      projects: [web, docs],
      expireAt,
    });
    await Promise.all([
      factory.createProjectToken({
        projects: [web],
        expireAt: inDays(now, 30),
      }),
      factory.createProjectToken({
        projects: [web],
        expireAt: inDays(now, -1),
      }),
      factory.createProjectToken({ projects: [web], expireAt: null }),
    ]);

    // Two runs racing, then a later one.
    await Promise.all([
      warnExpiringProjectTokens(now),
      warnExpiringProjectTokens(now),
    ]);
    await warnExpiringProjectTokens(new Date(now.getTime() + DAY_MS));

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
      expireAt: inDays(now, 6),
    });

    await warnExpiringProjectTokens(now);

    const warnings = await getWarnings();
    expect(
      warnings.map((warning) =>
        warning.recipients?.map((recipient) => recipient.userId),
      ),
    ).toEqual([[account.userId]]);
  });
});
