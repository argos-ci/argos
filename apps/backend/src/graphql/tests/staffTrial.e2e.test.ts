import { addDays } from "@argos/util/date";
import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { Subscription } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { createApolloServerApp } from "./util";

const StartStaffTrialMutation = `
  mutation StartStaffTrial($teamAccountId: ID!, $days: Int!) {
    startStaffTrial(input: { teamAccountId: $teamAccountId, days: $days }) {
      id
    }
  }
`;

const ExtendStaffTrialMutation = `
  mutation ExtendStaffTrial($teamAccountId: ID!, $days: Int!) {
    extendStaffTrial(input: { teamAccountId: $teamAccountId, days: $days }) {
      id
    }
  }
`;

async function createViewer(options: { staff: boolean }) {
  const userAccount = await factory.UserAccount.create();
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");
  await userAccount.user.$query().patch({ staff: options.staff });
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");

  return { userAccount, user: userAccount.user };
}

type Viewer = Awaited<ReturnType<typeof createViewer>>;

async function createTeamWithOwner() {
  const [teamAccount, ownerAccount] = await Promise.all([
    factory.TeamAccount.create(),
    factory.UserAccount.create(),
  ]);
  invariant(teamAccount.teamId, "team account has no team");
  invariant(ownerAccount.userId, "account has no user");
  await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userId: ownerAccount.userId,
    userLevel: "owner",
  });
  return { teamAccount, ownerUserId: ownerAccount.userId };
}

/** A team on a Stripe trial ending `daysLeft` days from now. */
async function createTrialingTeam(daysLeft: number) {
  const { teamAccount, ownerUserId } = await createTeamWithOwner();
  await factory.Subscription.create({
    accountId: teamAccount.id,
    provider: "stripe",
    status: "trialing",
    stripeSubscriptionId: "sub_staff_trial",
    subscriberId: ownerUserId,
    trialEndDate: addDays(new Date(), daysLeft).toISOString(),
  });
  return teamAccount;
}

async function send(
  query: string,
  viewer: Viewer,
  variables: { teamAccountId: string; days: number },
) {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    { user: viewer.user, account: viewer.userAccount },
  );
  return request(app).post("/graphql").send({ query, variables });
}

// Every case is refused before Stripe is called, which is what lets them run
// without a Stripe account.
describe("GraphQL staff trials", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("startStaffTrial", () => {
    it("is refused to non-staff", async () => {
      const [viewer, { teamAccount }] = await Promise.all([
        createViewer({ staff: false }),
        createTeamWithOwner(),
      ]);

      const res = await send(StartStaffTrialMutation, viewer, {
        teamAccountId: teamAccount.id,
        days: 14,
      });

      expect(res.body.errors[0].extensions.code).toBe("FORBIDDEN");
      expect(await Subscription.query().resultSize()).toBe(0);
    });

    it("is refused for a team that still has a subscription", async () => {
      const [viewer, { teamAccount }] = await Promise.all([
        createViewer({ staff: true }),
        createTeamWithOwner(),
      ]);
      await factory.Subscription.create({
        accountId: teamAccount.id,
        status: "active",
      });

      const res = await send(StartStaffTrialMutation, viewer, {
        teamAccountId: teamAccount.id,
        days: 14,
      });

      expect(res.body.errors[0].extensions.code).toBe("BAD_USER_INPUT");
      expect(res.body.errors[0].message).toBe(
        "This team already has a subscription.",
      );
      expect(await Subscription.query().resultSize()).toBe(1);
    });

    it("is refused for a length out of bounds", async () => {
      const [viewer, { teamAccount }] = await Promise.all([
        createViewer({ staff: true }),
        createTeamWithOwner(),
      ]);

      for (const days of [0, 366]) {
        const res = await send(StartStaffTrialMutation, viewer, {
          teamAccountId: teamAccount.id,
          days,
        });
        expect(res.body.errors[0].extensions.code).toBe("BAD_USER_INPUT");
        expect(res.body.errors[0].extensions.field).toBe("days");
      }
      expect(await Subscription.query().resultSize()).toBe(0);
    });
  });

  describe("extendStaffTrial", () => {
    it("is refused to non-staff", async () => {
      const [viewer, teamAccount] = await Promise.all([
        createViewer({ staff: false }),
        createTrialingTeam(5),
      ]);

      const res = await send(ExtendStaffTrialMutation, viewer, {
        teamAccountId: teamAccount.id,
        days: 14,
      });

      expect(res.body.errors[0].extensions.code).toBe("FORBIDDEN");
    });

    it("is refused for a team that is not on a trial", async () => {
      const [viewer, { teamAccount }] = await Promise.all([
        createViewer({ staff: true }),
        createTeamWithOwner(),
      ]);
      await factory.Subscription.create({
        accountId: teamAccount.id,
        status: "active",
      });

      const res = await send(ExtendStaffTrialMutation, viewer, {
        teamAccountId: teamAccount.id,
        days: 14,
      });

      expect(res.body.errors[0].extensions.code).toBe("BAD_USER_INPUT");
      expect(res.body.errors[0].message).toBe("This team is not on a trial.");
    });

    it("is refused when the trial would end too far out", async () => {
      const [viewer, teamAccount] = await Promise.all([
        createViewer({ staff: true }),
        createTrialingTeam(300),
      ]);

      // 300 days left plus 100 is past the 365-day bound, which counts from
      // today rather than from the current end.
      const res = await send(ExtendStaffTrialMutation, viewer, {
        teamAccountId: teamAccount.id,
        days: 100,
      });

      expect(res.body.errors[0].extensions.code).toBe("BAD_USER_INPUT");
      expect(res.body.errors[0].extensions.field).toBe("days");
    });
  });
});
