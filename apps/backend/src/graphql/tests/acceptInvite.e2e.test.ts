import { addDays } from "@argos/util/date";
import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { describe, expect, test } from "vitest";

import {
  type Account,
  TeamInvite,
  TeamUser,
  UserEmail,
  UserSession,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const EMAIL = "jane@acme.com";

const withInvite = test.extend<{
  teamAccount: Account;
  invite: TeamInvite;
  holderAccount: Account;
}>({
  teamAccount: async ({}, use) => {
    await setupDatabase();
    await use(await factory.TeamAccount.create());
  },
  invite: async ({ teamAccount }, use) => {
    invariant(teamAccount.teamId, "team account has no team");
    const inviter = await factory.User.create();
    await use(
      await TeamInvite.query().insertAndFetch({
        teamId: teamAccount.teamId,
        email: EMAIL,
        secret: TeamInvite.generateSecret(),
        userLevel: "member",
        invitedById: inviter.id,
        expiresAt: addDays(new Date(), 1).toISOString(),
      }),
    );
  },
  holderAccount: async ({ teamAccount: _teamAccount }, use) => {
    await use(await factory.UserAccount.create());
  },
});

async function acceptInviteSignedOut(invite: TeamInvite) {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    null,
  );
  const res = await request(app)
    .post("/graphql")
    .send({
      query: `
        mutation AcceptInvite($secret: String!) {
          acceptInvite(secret: $secret) {
            team {
              id
            }
          }
        }
      `,
      variables: { secret: invite.secret },
    });
  expectNoGraphQLError(res);
  expect(res.status).toBe(200);
}

async function expectOnlyMemberAndSession(args: {
  teamAccount: Account;
  userId: string;
}) {
  const teamUsers = await TeamUser.query().where({
    teamId: args.teamAccount.teamId,
  });
  expect(teamUsers.map((teamUser) => teamUser.userId)).toEqual([args.userId]);
  const sessions = await UserSession.query();
  expect(sessions.map((session) => session.userId)).toEqual([args.userId]);
}

describe("acceptInvite signed out", () => {
  withInvite(
    "signs in the user holding the email verified",
    async ({ teamAccount, invite, holderAccount }) => {
      invariant(holderAccount.userId, "user account has no user");
      await factory.UserEmail.create({
        userId: holderAccount.userId,
        email: EMAIL,
        verified: true,
      });

      await acceptInviteSignedOut(invite);

      await expectOnlyMemberAndSession({
        teamAccount,
        userId: holderAccount.userId,
      });
    },
  );

  withInvite(
    "creates an account rather than sign in the user holding the email unverified",
    async ({ teamAccount, invite, holderAccount }) => {
      invariant(holderAccount.userId, "user account has no user");
      await factory.UserEmail.create({
        userId: holderAccount.userId,
        email: EMAIL,
        verified: false,
      });

      await acceptInviteSignedOut(invite);

      const userEmail = await UserEmail.query().findById(EMAIL);
      invariant(userEmail, "email not found");
      expect(userEmail.verified).toBe(true);
      expect(userEmail.userId).not.toBe(holderAccount.userId);
      await expectOnlyMemberAndSession({
        teamAccount,
        userId: userEmail.userId,
      });
    },
  );
});
