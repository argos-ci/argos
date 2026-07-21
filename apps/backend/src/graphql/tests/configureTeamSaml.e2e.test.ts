import type express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { Team } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { createApolloServerApp } from "./util";

async function setupTeam(input: { samlIncluded: boolean }) {
  const userAccount = await factory.UserAccount.create();
  await userAccount.$fetchGraph("user");
  const teamAccount = await factory.TeamAccount.create();
  await factory.TeamUser.create({
    teamId: teamAccount.teamId!,
    userId: userAccount.userId!,
    userLevel: "owner",
  });

  const plan = await factory.Plan.create({
    samlIncluded: input.samlIncluded,
    usageBased: false,
  });

  await factory.Subscription.create({
    accountId: teamAccount.id,
    planId: plan.id,
    status: "active",
    endDate: null,
  });

  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    {
      user: userAccount.user!,
      account: userAccount,
    },
  );

  return { app, teamAccount };
}

function configureTeamSaml(app: express.Express, teamAccountId: string) {
  return request(app)
    .post("/graphql")
    .send({
      query: `
        mutation ConfigureTeamSaml($input: ConfigureTeamSamlInput!) {
          configureTeamSaml(input: $input) {
            id
          }
        }
      `,
      variables: {
        input: {
          teamAccountId,
          idpEntityId: "https://idp.example.com/entity",
          ssoUrl: "https://idp.example.com/sso",
          signingCertificate: "this-is-not-a-certificate",
          enabled: true,
        },
      },
    });
}

describe("GraphQL configureTeamSaml", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("rejects when SAML is not included in plan nor purchased as an add-on", async () => {
    const { app, teamAccount } = await setupTeam({ samlIncluded: false });

    const res = await configureTeamSaml(app, teamAccount.id);

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toBe(
      "SAML SSO is not included in your plan. Enable the SAML SSO add-on to use it.",
    );
  });

  it("accepts when the SAML SSO add-on is purchased", async () => {
    const { app, teamAccount } = await setupTeam({ samlIncluded: false });
    await Team.query()
      .findById(teamAccount.teamId!)
      .patch({ samlPurchased: true });

    const res = await configureTeamSaml(app, teamAccount.id);

    // Passes the access check and fails on certificate validation.
    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toBe("Invalid signing certificate.");
  });

  it("returns a field error when signing certificate is invalid", async () => {
    const { app, teamAccount } = await setupTeam({ samlIncluded: true });

    const res = await configureTeamSaml(app, teamAccount.id);

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toBe("Invalid signing certificate.");
    expect(res.body.errors[0].extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "signingCertificate",
    });
  });
});
