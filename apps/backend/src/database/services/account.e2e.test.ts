import { invariant } from "@argos/util/invariant";
import { describe, expect, test } from "vitest";

import { generateAuthEmailCode } from "@/auth/email";
import {
  type Account,
  GithubAccount,
  Team,
  TeamScimUser,
  TeamUser,
  User,
  UserEmail,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { updateScimUser } from "@/scim/service";

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

/**
 * Complete a login through the team's IdP, which vouches for `EMAIL`, in a
 * browser signed in as `signedInUserId`.
 */
async function logInWithSaml(args: {
  teamAccount: Account;
  signedInUserId?: string;
  linkConfirmed?: boolean;
}) {
  const login = await getOrCreateUserAccountFromSaml({
    email: EMAIL,
    ssoSubject: SSO_SUBJECT,
    signedInUserId: null,
    linkConfirmed: false,
    ...args,
  });
  invariant(login.type === "login", "Expected the login to complete");
  return login;
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

      await expect(logInWithSaml({ teamAccount })).rejects.toMatchObject({
        code: "SAML_ACCOUNT_LINK_REQUIRED",
      });
      expect(
        await findTeamUser({ teamAccount, userId: userAccount.userId }),
      ).toBeUndefined();
    },
  );

  withAccounts(
    "links the user holding the email verified once they confirm it signed in",
    async ({ teamAccount, userAccount }) => {
      invariant(userAccount.userId, "user account has no user");
      await addEmail({ account: userAccount, verified: true });

      const { account, creation } = await logInWithSaml({
        teamAccount,
        signedInUserId: userAccount.userId,
        linkConfirmed: true,
      });

      expect(account.id).toBe(userAccount.id);
      expect(creation).toBe(false);
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
          await factory.TeamUser.create({
            teamId: teamAccount.teamId,
            userId: userAccount.userId,
            userLevel: "member",
          });

          const result = logInWithSaml({ teamAccount });

          if (links) {
            expect((await result).account.id).toBe(userAccount.id);
          } else {
            await expect(result).rejects.toMatchObject({
              code: "SAML_ACCOUNT_LINK_REQUIRED",
            });
          }
        },
      );
    },
  );

  describe("when the team's SCIM created the user, who no longer belongs to it", () => {
    /**
     * A user the team's SCIM created with the email, which they have since
     * verified on their own (a contractor's own mailbox, say).
     */
    async function createScimUser(args: {
      teamAccount: Account;
      userAccount: Account;
      active: boolean;
    }) {
      const { teamId } = args.teamAccount;
      const { userId } = args.userAccount;
      invariant(teamId, "team account has no team");
      invariant(userId, "user account has no user");
      await addEmail({ account: args.userAccount, verified: true });
      return TeamScimUser.query().insertAndFetch({
        teamId,
        userId,
        userName: EMAIL,
        active: args.active,
        userCreated: true,
      });
    }

    async function expectRefused(args: {
      teamAccount: Account;
      userAccount: Account;
    }) {
      invariant(args.userAccount.userId, "user account has no user");
      await expect(
        logInWithSaml({ teamAccount: args.teamAccount }),
      ).rejects.toMatchObject({ code: "SAML_ACCOUNT_LINK_REQUIRED" });
      expect(
        await findTeamUser({
          teamAccount: args.teamAccount,
          userId: args.userAccount.userId,
        }),
      ).toBeUndefined();
    }

    withAccounts(
      "refuses to sign in once they left the team",
      async ({ teamAccount, userAccount }) => {
        await createScimUser({
          teamAccount,
          userAccount,
          active: true,
        });
        await expectRefused({ teamAccount, userAccount });
      },
    );

    withAccounts(
      "refuses to sign in once SCIM deactivated them",
      async ({ teamAccount, userAccount }) => {
        await createScimUser({
          teamAccount,
          userAccount,
          active: false,
        });
        await expectRefused({ teamAccount, userAccount });
      },
    );

    withAccounts(
      "refuses to sign in after SCIM reactivated them",
      async ({ teamAccount, userAccount }) => {
        const scimUser = await createScimUser({
          teamAccount,
          userAccount,
          active: false,
        });
        const team = await Team.query().findById(scimUser.teamId);
        invariant(team, "team not found");
        await updateScimUser({
          team,
          id: scimUser.id,
          update: (current) => ({ ...current, active: true }),
        });
        invariant(userAccount.userId, "user account has no user");
        // Reactivating makes them a member again.
        expect(
          await findTeamUser({ teamAccount, userId: userAccount.userId }),
        ).toBeDefined();

        await expect(logInWithSaml({ teamAccount })).rejects.toMatchObject({
          code: "SAML_ACCOUNT_LINK_REQUIRED",
        });
      },
    );
  });

  withAccounts(
    "creates an account rather than link the user holding the email unverified",
    async ({ teamAccount, userAccount }) => {
      invariant(userAccount.userId, "user account has no user");
      await addEmail({ account: userAccount, verified: false });

      const { account, creation } = await logInWithSaml({ teamAccount });

      expect(account.id).not.toBe(userAccount.id);
      expect(creation).toBe(true);
      invariant(account.userId, "account has no user");
      expect(
        await findTeamUser({ teamAccount, userId: userAccount.userId }),
      ).toBeUndefined();
      expect(
        await findTeamUser({ teamAccount, userId: account.userId }),
      ).toMatchObject({ ssoSubject: SSO_SUBJECT });
      expect(await UserEmail.query().findById(EMAIL)).toMatchObject({
        userId: account.userId,
        verified: false,
      });
    },
  );

  withAccounts(
    "creates an account for a person invited to the team",
    async ({ teamAccount }) => {
      invariant(teamAccount.teamId, "team account has no team");
      await factory.TeamInvite.create({
        teamId: teamAccount.teamId,
        email: EMAIL,
      });

      const { account } = await logInWithSaml({ teamAccount });

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
