import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { createApolloServerApp } from "./util";

describe("GraphQL configureTeamSaml", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("returns a field error when signing certificate is invalid", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const teamAccount = await factory.TeamAccount.create();
    await factory.TeamUser.create({
      teamId: teamAccount.teamId!,
      userId: userAccount.userId!,
      userLevel: "owner",
    });

    const plan = await factory.Plan.create({
      samlIncluded: true,
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

    const res = await request(app)
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
            teamAccountId: teamAccount.id,
            idpEntityId: "https://idp.example.com/entity",
            ssoUrl: "https://idp.example.com/sso",
            signingCertificate: "this-is-not-a-certificate",
            enabled: true,
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toBe("Invalid signing certificate.");
    expect(res.body.errors[0].extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "signingCertificate",
    });
  });
});
