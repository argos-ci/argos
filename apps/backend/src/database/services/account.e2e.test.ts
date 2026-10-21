import { invariant } from "@argos/util/invariant";
import { describe, expect, test } from "vitest";

import { type Account, TeamUser, UserEmail } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getOrCreateUserAccountFromSaml } from "./account";

const EMAIL = "jane@acme.com";
const SSO_SUBJECT = "idp-jane";

const withTeamAndUser = test.extend<{
  teamAccount: Account;
  userAccount: Account;
}>({
  teamAccount: async ({}, use) => {
    await setupDatabase();
    await use(await factory.TeamAccount.create());
  },
  userAccount: async ({ teamAccount: _teamAccount }, use) => {
    await use(await factory.UserAccount.create());
  },
});

async function findTeamUser(args: { teamAccount: Account; userId: string }) {
  invariant(args.teamAccount.teamId, "team account has no team");
  return TeamUser.query().findOne({
    teamId: args.teamAccount.teamId,
    userId: args.userId,
  });
}

describe("getOrCreateUserAccountFromSaml", () => {
  withTeamAndUser(
    "links the user holding the email verified",
    async ({ teamAccount, userAccount }) => {
      invariant(userAccount.userId, "user account has no user");
      await factory.UserEmail.create({
        userId: userAccount.userId,
        email: EMAIL,
        verified: true,
      });

      const account = await getOrCreateUserAccountFromSaml({
        email: EMAIL,
        teamAccount,
        ssoSubject: SSO_SUBJECT,
      });

      expect(account.id).toBe(userAccount.id);
      expect(
        await findTeamUser({ teamAccount, userId: userAccount.userId }),
      ).toMatchObject({ ssoSubject: SSO_SUBJECT });
    },
  );

  withTeamAndUser(
    "creates an account rather than link the user holding the email unverified",
    async ({ teamAccount, userAccount }) => {
      invariant(userAccount.userId, "user account has no user");
      await factory.UserEmail.create({
        userId: userAccount.userId,
        email: EMAIL,
        verified: false,
      });

      const account = await getOrCreateUserAccountFromSaml({
        email: EMAIL,
        teamAccount,
        ssoSubject: SSO_SUBJECT,
      });

      expect(account.id).not.toBe(userAccount.id);
      invariant(account.userId, "account has no user");
      expect(
        await findTeamUser({ teamAccount, userId: userAccount.userId }),
      ).toBeUndefined();
      expect(
        await findTeamUser({ teamAccount, userId: account.userId }),
      ).toMatchObject({ ssoSubject: SSO_SUBJECT });
      expect(await UserEmail.query().findById(EMAIL)).toMatchObject({
        userId: account.userId,
        verified: true,
      });
    },
  );
});
