import { invariant } from "@argos/util/invariant";
import type express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { Team } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { createApolloServerApp } from "./util";

async function setupTeam(input: {
  userLevel: "owner" | "member";
  plan: { staticIpIncluded: boolean } | null;
}) {
  const userAccount = await factory.UserAccount.create();
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user && userAccount.userId, "user not fetched");
  const teamAccount = await factory.TeamAccount.create();
  invariant(teamAccount.teamId, "team account has no team");
  await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userId: userAccount.userId,
    userLevel: input.userLevel,
  });

  if (input.plan) {
    const plan = await factory.Plan.create({
      staticIpIncluded: input.plan.staticIpIncluded,
    });
    // A GitHub Marketplace subscription: active, but with no Stripe
    // subscription to bill an add-on on.
    await factory.Subscription.create({
      accountId: teamAccount.id,
      planId: plan.id,
      status: "active",
      endDate: null,
    });
  }

  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    { user: userAccount.user, account: userAccount },
  );

  return { app, teamId: teamAccount.teamId, teamAccountId: teamAccount.id };
}

function toggleStaticIp(
  app: express.Express,
  mutation: "enableStaticIpOnTeam" | "disableStaticIpOnTeam",
  teamAccountId: string,
) {
  return request(app)
    .post("/graphql")
    .send({
      query: `
        mutation ToggleStaticIp($teamAccountId: ID!) {
          ${mutation}(input: { teamAccountId: $teamAccountId }) {
            id
            staticIpEnabled
          }
        }
      `,
      variables: { teamAccountId },
    });
}

async function getStaticIpEnabled(teamId: string) {
  const team = await Team.query().findById(teamId).throwIfNotFound();
  return team.staticIpEnabled;
}

describe("GraphQL Static IP", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("enables Static IP without billing when the plan includes it", async () => {
    const { app, teamId, teamAccountId } = await setupTeam({
      userLevel: "owner",
      plan: { staticIpIncluded: true },
    });

    const res = await toggleStaticIp(
      app,
      "enableStaticIpOnTeam",
      teamAccountId,
    );

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.enableStaticIpOnTeam.staticIpEnabled).toBe(true);
    expect(await getStaticIpEnabled(teamId)).toBe(true);
  });

  it("refuses a team without an active subscription", async () => {
    const { app, teamId, teamAccountId } = await setupTeam({
      userLevel: "owner",
      plan: null,
    });

    const res = await toggleStaticIp(
      app,
      "enableStaticIpOnTeam",
      teamAccountId,
    );

    expect(res.body.errors?.[0]?.message).toBe(
      "A valid subscription is required to enable Static IP",
    );
    expect(await getStaticIpEnabled(teamId)).toBe(false);
  });

  it("refuses a subscription that cannot carry the add-on", async () => {
    const { app, teamId, teamAccountId } = await setupTeam({
      userLevel: "owner",
      plan: { staticIpIncluded: false },
    });

    const res = await toggleStaticIp(
      app,
      "enableStaticIpOnTeam",
      teamAccountId,
    );

    expect(res.body.errors?.[0]?.message).toBe(
      "Your plan does not allow enabling Static IP, please contact us.",
    );
    expect(await getStaticIpEnabled(teamId)).toBe(false);
  });

  it("refuses a member who does not administer the team", async () => {
    const { app, teamId, teamAccountId } = await setupTeam({
      userLevel: "member",
      plan: { staticIpIncluded: true },
    });

    const res = await toggleStaticIp(
      app,
      "enableStaticIpOnTeam",
      teamAccountId,
    );

    expect(res.body.errors).toHaveLength(1);
    expect(await getStaticIpEnabled(teamId)).toBe(false);
  });

  it("disables Static IP", async () => {
    const { app, teamId, teamAccountId } = await setupTeam({
      userLevel: "owner",
      plan: { staticIpIncluded: true },
    });
    await Team.query().findById(teamId).patch({ staticIpEnabled: true });

    const res = await toggleStaticIp(
      app,
      "disableStaticIpOnTeam",
      teamAccountId,
    );

    expect(res.body.errors).toBeUndefined();
    expect(await getStaticIpEnabled(teamId)).toBe(false);
  });
});
