import { addDays } from "@argos/util/date";
import { invariant } from "@argos/util/invariant";
import { describe, expect, test } from "vitest";

import { generateAuthEmailCode } from "@/auth/email";
import {
  type Account,
  GithubAccount,
  TeamInvite,
  TeamScimUser,
  TeamUser,
  User,
  UserEmail,
} from "@/database/models";
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
    "refuses to sign in to the user holding the email verified",
    async ({ teamAccount, userAccount }) => {
      invariant(userAccount.userId, "user account has no user");
      await addEmail({ account: userAccount, verified: true });

      await expect(
        getOrCreateUserAccountFromSaml({
          email: EMAIL,
          teamAccount,
          ssoSubject: SSO_SUBJECT,
          signedInUserId: null,
        }),
      ).rejects.toMatchObject({ code: "SAML_ACCOUNT_LINK_REQUIRED" });
      expect(
        await findTeamUser({ teamAccount, userId: userAccount.userId }),
      ).toBeUndefined();
    },
  );

  withAccounts(
    "links the user holding the email verified once signed in to it",
    async ({ teamAccount, userAccount }) => {
      invariant(userAccount.userId, "user account has no user");
      await addEmail({ account: userAccount, verified: true });

      const account = await getOrCreateUserAccountFromSaml({
        email: EMAIL,
        teamAccount,
        ssoSubject: SSO_SUBJECT,
        signedInUserId: userAccount.userId,
      });

      expect(account.id).toBe(userAccount.id);
      expect(
        await findTeamUser({ teamAccount, userId: userAccount.userId }),
      ).toMatchObject({ ssoSubject: SSO_SUBJECT });
    },
  );

  describe.each([
    { userCreated: true, links: true },
    { userCreated: false, links: false },
  ])(
    "when the team's SCIM provisioned the user holding the email verified (userCreated: $userCreated)",
    ({ userCreated, links }) => {
      withAccounts(
        links ? "links it" : "refuses to sign in to it",
        async ({ teamAccount, userAccount }) => {
          invariant(teamAccount.teamId, "team account has no team");
          invariant(userAccount.userId, "user account has no user");
          await addEmail({ account: userAccount, verified: true });
          await TeamScimUser.query().insert({
            teamId: teamAccount.teamId,
            userId: userAccount.userId,
            userName: EMAIL,
            active: true,
            userCreated,
          });

          const result = getOrCreateUserAccountFromSaml({
            email: EMAIL,
            teamAccount,
            ssoSubject: SSO_SUBJECT,
            signedInUserId: null,
          });

          if (links) {
            expect((await result).id).toBe(userAccount.id);
          } else {
            await expect(result).rejects.toMatchObject({
              code: "SAML_ACCOUNT_LINK_REQUIRED",
            });
          }
        },
      );
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
        signedInUserId: null,
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

  withAccounts(
    "creates an account for a person invited to the team",
    async ({ teamAccount, userAccount }) => {
      invariant(teamAccount.teamId, "team account has no team");
      invariant(userAccount.userId, "user account has no user");
      await TeamInvite.query().insert({
        teamId: teamAccount.teamId,
        email: EMAIL,
        secret: TeamInvite.generateSecret(),
        userLevel: "member",
        invitedById: userAccount.userId,
        expiresAt: addDays(new Date(), 1).toISOString(),
      });

      const account = await getOrCreateUserAccountFromSaml({
        email: EMAIL,
        teamAccount,
        ssoSubject: SSO_SUBJECT,
        signedInUserId: null,
      });

      invariant(account.userId, "account has no user");
      expect(
        await findTeamUser({ teamAccount, userId: account.userId }),
      ).toMatchObject({ ssoSubject: SSO_SUBJECT });
    },
  );
});

describe.each([
  {
    name: "authenticateWithEmail",
    signIn: async () =>
      authenticateWithEmail({
        email: EMAIL,
        code: await generateAuthEmailCode(EMAIL),
      }),
  },
  {
    name: "getOrCreateUserAccountFromGhAccount",
    signIn: async () =>
      getOrCreateUserAccountFromGhAccount({
        ghAccount: await factory.GithubAccount.create({
          email: EMAIL,
          emails: [EMAIL],
        }),
        attachToAccount: null,
      }),
  },
])("$name", ({ signIn }) => {
  withAccounts(
    "links the user holding the email verified",
    async ({ userAccount }) => {
      await addEmail({ account: userAccount, verified: true });

      expect(await signIn()).toMatchObject({
        account: { id: userAccount.id },
        creation: false,
      });
    },
  );

  withAccounts(
    "creates an account rather than link the user holding the email unverified",
    async ({ userAccount }) => {
      await addEmail({ account: userAccount, verified: false });

      const { account, creation } = await signIn();

      expect(creation).toBe(true);
      expect(account.id).not.toBe(userAccount.id);
      await expectEmailVerifiedOn(account);
    },
  );
});

describe("getOrCreateUserAccountFromGhAccount", () => {
  withAccounts(
    "verifies the email on the user it links by GitHub account",
    async ({ userAccount }) => {
      invariant(userAccount.userId, "user account has no user");
      invariant(userAccount.githubAccountId, "user account has no GitHub");
      await User.query().findById(userAccount.userId).patch({ email: null });
      await addEmail({ account: userAccount, verified: false });
      const ghAccount = await GithubAccount.query().patchAndFetchById(
        userAccount.githubAccountId,
        { email: EMAIL, emails: [EMAIL] },
      );

      expect(
        await getOrCreateUserAccountFromGhAccount({
          ghAccount,
          attachToAccount: null,
        }),
      ).toMatchObject({ account: { id: userAccount.id }, creation: false });
      await expectEmailVerifiedOn(userAccount);
    },
  );
});
