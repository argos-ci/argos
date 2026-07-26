import { invariant } from "@argos/util/invariant";
import { describe, expect, test } from "vitest";

import { TeamDomain, User } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import {
  enableTeamDomainAutoJoin,
  getEligibleAutoJoinDomain,
} from "./team-domain";

async function listDomains(teamId: string): Promise<string[]> {
  const teamDomains = await TeamDomain.query()
    .where({ teamId })
    .orderBy("domain", "asc");
  return teamDomains.map((teamDomain) => teamDomain.domain);
}

const withUserAndTeam = test.extend<{
  userId: string;
  teamId: string;
}>({
  // eslint-disable-next-line no-empty-pattern
  userId: async ({}, use) => {
    await setupDatabase();
    const userAccount = await factory.UserAccount.create();
    invariant(userAccount.userId, "user account has no user");
    await use(userAccount.userId);
  },
  teamId: async ({ userId }, use) => {
    const teamAccount = await factory.TeamAccount.create();
    invariant(teamAccount.teamId, "team account has no team");
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId,
      userLevel: "owner",
    });
    await use(teamAccount.teamId);
  },
});

describe("getEligibleAutoJoinDomain", () => {
  withUserAndTeam(
    "returns nothing without a verified email",
    async ({ userId }) => {
      expect(await getEligibleAutoJoinDomain({ userId })).toBeNull();
    },
  );

  withUserAndTeam("returns a company domain", async ({ userId }) => {
    await factory.UserEmail.create({
      userId,
      email: "jane@acme.com",
      verified: true,
    });

    expect(await getEligibleAutoJoinDomain({ userId })).toBe("acme.com");
  });

  withUserAndTeam("ignores unverified addresses", async ({ userId }) => {
    await factory.UserEmail.create({
      userId,
      email: "jane@acme.com",
      verified: false,
    });

    expect(await getEligibleAutoJoinDomain({ userId })).toBeNull();
  });

  withUserAndTeam("ignores consumer providers", async ({ userId }) => {
    await factory.UserEmail.create({
      userId,
      email: "jane@gmail.com",
      verified: true,
    });

    expect(await getEligibleAutoJoinDomain({ userId })).toBeNull();
  });

  withUserAndTeam(
    "prefers the primary address over another company domain",
    async ({ userId }) => {
      // `aaa.com` sorts first, so only the primary-address preference can put
      // `work.com` ahead of it.
      await factory.UserEmail.create({
        userId,
        email: "jane@aaa.com",
        verified: true,
      });
      await factory.UserEmail.create({
        userId,
        email: "jane@work.com",
        verified: true,
      });
      await User.query().findById(userId).patch({ email: "jane@work.com" });

      expect(await getEligibleAutoJoinDomain({ userId })).toBe("work.com");
    },
  );

  withUserAndTeam(
    "falls back to a company domain when the primary is a consumer one",
    async ({ userId }) => {
      await factory.UserEmail.create({
        userId,
        email: "jane@gmail.com",
        verified: true,
      });
      await factory.UserEmail.create({
        userId,
        email: "jane@work.com",
        verified: true,
      });
      await User.query().findById(userId).patch({ email: "jane@gmail.com" });

      expect(await getEligibleAutoJoinDomain({ userId })).toBe("work.com");
    },
  );
});

describe("enableTeamDomainAutoJoin", () => {
  withUserAndTeam(
    "opens the team to the domain",
    async ({ userId, teamId }) => {
      await factory.UserEmail.create({
        userId,
        email: "jane@acme.com",
        verified: true,
      });

      expect(await enableTeamDomainAutoJoin({ userId, teamId })).toBe(
        "acme.com",
      );
      await expect(listDomains(teamId)).resolves.toEqual(["acme.com"]);
    },
  );

  withUserAndTeam("is a no-op when run twice", async ({ userId, teamId }) => {
    await factory.UserEmail.create({
      userId,
      email: "jane@acme.com",
      verified: true,
    });

    await enableTeamDomainAutoJoin({ userId, teamId });
    await enableTeamDomainAutoJoin({ userId, teamId });

    await expect(listDomains(teamId)).resolves.toEqual(["acme.com"]);
  });

  withUserAndTeam(
    "opens nothing without an eligible domain",
    async ({ userId, teamId }) => {
      await factory.UserEmail.create({
        userId,
        email: "jane@gmail.com",
        verified: true,
      });

      expect(await enableTeamDomainAutoJoin({ userId, teamId })).toBeNull();
      await expect(listDomains(teamId)).resolves.toEqual([]);
    },
  );
});
