import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, describe, expect } from "vitest";

import { generateAuthEmailCode } from "@/auth/email";
import { createSamlAuthCode } from "@/auth/saml";
import { SESSION_COOKIE_NAME } from "@/auth/session-cookie";
import {
  Plan,
  TeamSamlConfig,
  type Account,
  type TeamUser,
  type User,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { setupRedis } from "@/util/redis/testing";
import authRouter from "@/web/api/auth";
import { createTestApp } from "@/web/test-util";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

setupRedis();

const EMAIL = "jane@acme.com";
const SSO_SUBJECT = "idp-jane";

type Viewer = { user: User; account: Account };

/** A request made with a real session cookie rather than a mocked viewer. */
type SessionCaller = { cookie: string };

async function createTeamUser(input: {
  teamAccount: Account;
  userLevel: TeamUser["userLevel"];
}): Promise<Viewer> {
  invariant(input.teamAccount.teamId, "team account has no team");
  const account = await factory.UserAccount.create();
  await account.$fetchGraph("user");
  invariant(account.user, "user not fetched");
  await factory.TeamUser.create({
    teamId: input.teamAccount.teamId,
    userId: account.user.id,
    userLevel: input.userLevel,
  });
  return { user: account.user, account };
}

async function createSamlEnforcedTeam(plan: Plan): Promise<Account> {
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
  return teamAccount;
}

/** Make `user` a member whom `teamAccount`'s IdP knows as `SSO_SUBJECT`. */
async function addSamlMember(teamAccount: Account, user: User) {
  invariant(teamAccount.teamId, "team account has no team");
  await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userId: user.id,
    userLevel: "member",
    ssoSubject: SSO_SUBJECT,
  });
}

const it = base.extend<{
  plan: Plan;
  teamAccount: Account;
  owner: Viewer;
  member: Viewer;
  samlMember: User;
}>({
  plan: async ({}, use) => {
    await setupDatabase();
    await use(await factory.Plan.create({ samlIncluded: true }));
  },
  teamAccount: async ({ plan }, use) => {
    await use(await createSamlEnforcedTeam(plan));
  },
  owner: async ({ teamAccount }, use) => {
    await use(await createTeamUser({ teamAccount, userLevel: "owner" }));
  },
  member: async ({ teamAccount }, use) => {
    await use(await createTeamUser({ teamAccount, userLevel: "member" }));
  },
  samlMember: async ({ teamAccount }, use) => {
    const account = await factory.UserAccount.create();
    await account.$fetchGraph("user");
    invariant(account.user, "user not fetched");
    await factory.UserEmail.create({
      userId: account.user.id,
      email: EMAIL,
      verified: true,
    });
    await addSamlMember(teamAccount, account.user);
    await use(account.user);
  },
});

async function graphql(
  caller: Viewer | SessionCaller,
  query: string,
  variables: Record<string, unknown>,
) {
  const isSession = "cookie" in caller;
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    isSession ? null : caller,
  );
  const req = request(app).post("/graphql");
  if (isSession) {
    req.set("Cookie", caller.cookie);
  }
  return req.send({ query, variables });
}

function queryAccount(caller: Viewer | SessionCaller, slug: string) {
  return graphql(
    caller,
    `
      query Account($slug: String!) {
        account(slug: $slug) {
          id
          ... on Team {
            viewerSignedInWithSaml
          }
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

function getSessionCaller(res: request.Response): SessionCaller {
  const cookie = res
    .get("Set-Cookie")
    ?.find((header) => header.startsWith(`${SESSION_COOKIE_NAME}=`));
  invariant(cookie, "login set no session cookie");
  const [pair] = cookie.split(";");
  invariant(pair, "malformed session cookie");
  return { cookie: pair };
}

/**
 * Log in through `teamAccount`'s IdP, as the callback page does once the IdP
 * has vouched for `EMAIL`.
 */
async function logInWithSaml(teamAccount: Account): Promise<SessionCaller> {
  const code = await createSamlAuthCode({
    teamAccountId: teamAccount.id,
    email: EMAIL,
    ssoSubject: SSO_SUBJECT,
  });
  const res = await request(createTestApp(authRouter))
    .post("/auth/saml")
    .send({ code });
  expect(res.status).toBe(200);
  return getSessionCaller(res);
}

async function logInWithEmail(): Promise<SessionCaller> {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    null,
  );
  const res = await request(app)
    .post("/graphql")
    .send({
      query: `
        mutation AuthenticateWithEmail($input: AuthFromEmailInput!) {
          authenticateWithEmail(input: $input) {
            creation
          }
        }
      `,
      variables: {
        input: { email: EMAIL, code: await generateAuthEmailCode(EMAIL) },
      },
    });
  expectNoGraphQLError(res);
  return getSessionCaller(res);
}

function expectSamlRequired(res: request.Response) {
  expect(res.body.data.account).toBeNull();
  expect(res.body.errors[0].extensions.argosErrorCode).toBe(
    "SAML_SSO_REQUIRED",
  );
}

describe("GraphQL team SAML enforcement", () => {
  it("requires SAML from members while it is enabled", async ({
    teamAccount,
    member,
  }) => {
    const res = await queryAccount(member, teamAccount.slug);

    expectSamlRequired(res);
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

    expectSamlRequired(res);
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

  it("satisfies only the team whose IdP opened the session", async ({
    plan,
    teamAccount,
    samlMember,
  }) => {
    const otherTeamAccount = await createSamlEnforcedTeam(plan);
    await addSamlMember(otherTeamAccount, samlMember);
    // The member has been through the other team's IdP too, on another device.
    const otherTeamSession = await logInWithSaml(otherTeamAccount);

    const session = await logInWithSaml(teamAccount);

    const res = await queryAccount(session, teamAccount.slug);
    expectNoGraphQLError(res);
    expect(res.body.data.account).toEqual({
      id: teamAccount.id,
      viewerSignedInWithSaml: true,
    });
    expectSamlRequired(await queryAccount(session, otherTeamAccount.slug));
    const otherRes = await queryAccount(
      otherTeamSession,
      otherTeamAccount.slug,
    );
    expectNoGraphQLError(otherRes);
    expect(otherRes.body.data.account.id).toBe(otherTeamAccount.id);
  });

  it("keeps a SAML session through a login with another method elsewhere", async ({
    teamAccount,
    samlMember: _samlMember,
  }) => {
    const samlSession = await logInWithSaml(teamAccount);

    const emailSession = await logInWithEmail();

    const res = await queryAccount(samlSession, teamAccount.slug);
    expectNoGraphQLError(res);
    expect(res.body.data.account.id).toBe(teamAccount.id);
    expectSamlRequired(await queryAccount(emailSession, teamAccount.slug));
  });
});
