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
  holderId: string;
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
  holderId: async ({ teamAccount: _teamAccount }, use) => {
    const { userId } = await factory.UserAccount.create();
    invariant(userId, "user account has no user");
    await use(userId);
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

async function expectOnlyMemberAndSession(teamId: string, userId: string) {
  const teamUsers = await TeamUser.query().where({ teamId });
  expect(teamUsers.map((teamUser) => teamUser.userId)).toEqual([userId]);
  const sessions = await UserSession.query();
  expect(sessions.map((session) => session.userId)).toEqual([userId]);
}

describe("acceptInvite signed out", () => {
  withInvite(
    "signs in the user holding the email verified",
    async ({ invite, holderId }) => {
      await factory.UserEmail.create({
        userId: holderId,
        email: EMAIL,
        verified: true,
      });

      await acceptInviteSignedOut(invite);

      await expectOnlyMemberAndSession(invite.teamId, holderId);
    },
  );

  withInvite(
    "creates an account rather than sign in the user holding the email unverified",
    async ({ invite, holderId }) => {
      await factory.UserEmail.create({
        userId: holderId,
        email: EMAIL,
        verified: false,
      });

      await acceptInviteSignedOut(invite);

      const userEmail = await UserEmail.query().findById(EMAIL);
      invariant(userEmail, "email not found");
      expect(userEmail.verified).toBe(true);
      expect(userEmail.userId).not.toBe(holderId);
      await expectOnlyMemberAndSession(invite.teamId, userEmail.userId);
    },
  );
});
