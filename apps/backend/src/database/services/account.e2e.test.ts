import { invariant } from "@argos/util/invariant";
import { describe, expect, test } from "vitest";

import { generateAuthEmailCode } from "@/auth/email";
import { type Account, TeamUser, UserEmail } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import {
  authenticateWithEmail,
  getOrCreateUserAccountFromGhAccount,
  getOrCreateUserAccountFromSaml,
} from "./account";

const EMAIL = "jane@acme.com";
const SSO_SUBJECT = "idp-jane";

const withAccounts = test.extend<{
  userAccount: Account;
  teamAccount: Account;
}>({
  userAccount: async ({}, use) => {
    await setupDatabase();
    await use(await factory.UserAccount.create());
  },
  teamAccount: async ({ userAccount: _userAccount }, use) => {
    await use(await factory.TeamAccount.create());
  },
});

async function addEmail(args: { account: Account; verified: boolean }) {
  invariant(args.account.userId, "user account has no user");
  await factory.UserEmail.create({
    userId: args.account.userId,
    email: EMAIL,
    verified: args.verified,
  });
}

async function expectEmailVerifiedOn(account: Account) {
  invariant(account.userId, "account has no user");
  expect(await UserEmail.query().findById(EMAIL)).toMatchObject({
    userId: account.userId,
    verified: true,
  });
}

async function findTeamUser(args: { teamAccount: Account; userId: string }) {
  invariant(args.teamAccount.teamId, "team account has no team");
  return TeamUser.query().findOne({
    teamId: args.teamAccount.teamId,
    userId: args.userId,
  });
}

describe("getOrCreateUserAccountFromSaml", () => {
  withAccounts(
    "links the user holding the email verified",
    async ({ teamAccount, userAccount }) => {
      invariant(userAccount.userId, "user account has no user");
      await addEmail({ account: userAccount, verified: true });

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

  withAccounts(
    "creates an account rather than link the user holding the email unverified",
    async ({ teamAccount, userAccount }) => {
      invariant(userAccount.userId, "user account has no user");
      await addEmail({ account: userAccount, verified: false });

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
      await expectEmailVerifiedOn(account);
    },
  );
});

describe("authenticateWithEmail", () => {
  async function authenticate() {
    const code = await generateAuthEmailCode(EMAIL);
    return authenticateWithEmail({ email: EMAIL, code });
  }

  withAccounts(
    "logs into the user holding the email verified",
    async ({ userAccount }) => {
      await addEmail({ account: userAccount, verified: true });

      expect(await authenticate()).toMatchObject({
        account: { id: userAccount.id },
        creation: false,
      });
    },
  );

  withAccounts(
    "creates an account rather than log into the user holding the email unverified",
    async ({ userAccount }) => {
      await addEmail({ account: userAccount, verified: false });

      const { account, creation } = await authenticate();

      expect(creation).toBe(true);
      expect(account.id).not.toBe(userAccount.id);
      await expectEmailVerifiedOn(account);
    },
  );
});

describe("getOrCreateUserAccountFromGhAccount", () => {
  async function signInWithGithub() {
    const ghAccount = await factory.GithubAccount.create({
      email: EMAIL,
      emails: [EMAIL],
    });
    return getOrCreateUserAccountFromGhAccount({
      ghAccount,
      attachToAccount: null,
    });
  }

  withAccounts(
    "links the user holding the email verified",
    async ({ userAccount }) => {
      await addEmail({ account: userAccount, verified: true });

      expect(await signInWithGithub()).toMatchObject({
        account: { id: userAccount.id },
        creation: false,
      });
    },
  );

  withAccounts(
    "creates an account rather than link the user holding the email unverified",
    async ({ userAccount }) => {
      await addEmail({ account: userAccount, verified: false });

      const { account, creation } = await signInWithGithub();

      expect(creation).toBe(true);
      expect(account.id).not.toBe(userAccount.id);
      await expectEmailVerifiedOn(account);
    },
  );
});
