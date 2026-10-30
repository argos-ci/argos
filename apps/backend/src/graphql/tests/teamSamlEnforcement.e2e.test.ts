import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, describe, expect } from "vitest";

import {
  Plan,
  TeamSamlConfig,
  type Account,
  type TeamUser,
  type User,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

type Viewer = { user: User; account: Account };

async function createTeamUser(input: {
  teamAccount: Account;
  userLevel: TeamUser["userLevel"];
  lastAuthMethod: TeamUser["lastAuthMethod"];
}): Promise<Viewer> {
  invariant(input.teamAccount.teamId, "team account has no team");
  const account = await factory.UserAccount.create();
  await account.$fetchGraph("user");
  invariant(account.user, "user not fetched");
  await factory.TeamUser.create({
    teamId: input.teamAccount.teamId,
    userId: account.user.id,
    userLevel: input.userLevel,
    lastAuthMethod: input.lastAuthMethod,
  });
  return { user: account.user, account };
}

const it = base.extend<{
  plan: Plan;
  teamAccount: Account;
  owner: Viewer;
  member: Viewer;
}>({
  plan: async ({}, use) => {
    await setupDatabase();
    await use(await factory.Plan.create({ samlIncluded: true }));
  },
  teamAccount: async ({ plan }, use) => {
    const teamAccount = await factory.TeamAccount.create();
    await factory.Subscription.create({
      accountId: teamAccount.id,
      planId: plan.id,
      status: "active",
      endDate: null,
    });
    await TeamSamlConfig.query().insert({
      accountId: teamAccount.id,
      idpEntityId: "https://idp.example.com/entity",
      ssoUrl: "https://idp.example.com/sso",
      signingCertificate: "fake-certificate",
      enabled: true,
      enforced: true,
      enforcedAt: new Date().toISOString(),
    });
    await use(teamAccount);
  },
  owner: async ({ teamAccount }, use) => {
    await use(
      await createTeamUser({
        teamAccount,
        userLevel: "owner",
        lastAuthMethod: "saml",
      }),
    );
  },
  member: async ({ teamAccount }, use) => {
    await use(
      await createTeamUser({
        teamAccount,
        userLevel: "member",
        lastAuthMethod: "github",
      }),
    );
  },
});

async function graphql(
  viewer: Viewer,
  query: string,
  variables: Record<string, unknown>,
) {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    viewer,
  );
  return request(app).post("/graphql").send({ query, variables });
}

function queryAccount(viewer: Viewer, slug: string) {
  return graphql(
    viewer,
    `
      query Account($slug: String!) {
        account(slug: $slug) {
          id
        }
      }
    `,
    { slug },
  );
}

async function setTeamSamlEnabled(
  viewer: Viewer,
  teamAccountId: string,
  enabled: boolean,
) {
  const res = await graphql(
    viewer,
    `
      mutation ConfigureTeamSaml($input: ConfigureTeamSamlInput!) {
        configureTeamSaml(input: $input) {
          id
          enabled
        }
      }
    `,
    { input: { teamAccountId, enabled } },
  );
  expectNoGraphQLError(res);
  expect(res.body.data.configureTeamSaml.enabled).toBe(enabled);
}

describe("GraphQL team SAML enforcement", () => {
  it("requires SAML from members while it is enabled", async ({
    teamAccount,
    member,
  }) => {
    const res = await queryAccount(member, teamAccount.slug);

    expect(res.body.data.account).toBeNull();
    expect(res.body.errors[0].extensions.argosErrorCode).toBe(
      "SAML_SSO_REQUIRED",
    );
  });

  it("lets members in with their usual method once SAML is disabled", async ({
    teamAccount,
    owner,
    member,
  }) => {
    await setTeamSamlEnabled(owner, teamAccount.id, false);

    const res = await queryAccount(member, teamAccount.slug);

    expectNoGraphQLError(res);
    expect(res.body.data.account.id).toBe(teamAccount.id);
  });

  it("requires SAML again once it is re-enabled", async ({
    teamAccount,
    owner,
    member,
  }) => {
    await setTeamSamlEnabled(owner, teamAccount.id, false);
    await setTeamSamlEnabled(owner, teamAccount.id, true);

    const res = await queryAccount(member, teamAccount.slug);

    expect(res.body.errors[0].extensions.argosErrorCode).toBe(
      "SAML_SSO_REQUIRED",
    );
  });

  it("lets members in once the plan no longer includes SAML", async ({
    plan,
    teamAccount,
    member,
  }) => {
    await Plan.query().findById(plan.id).patch({ samlIncluded: false });

    const res = await queryAccount(member, teamAccount.slug);

    expectNoGraphQLError(res);
    expect(res.body.data.account.id).toBe(teamAccount.id);
  });
});
