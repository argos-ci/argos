import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, describe, expect } from "vitest";

import { generateAuthEmailCode } from "@/auth/email";
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
import { exchangeSamlCode } from "@/web/api/auth.test-util";

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
  ssoSubject?: string;
}): Promise<Viewer> {
  invariant(input.teamAccount.teamId, "team account has no team");
  const account = await factory.UserAccount.create();
  await account.$fetchGraph("user");
  invariant(account.user, "user not fetched");
  await factory.TeamUser.create({
    teamId: input.teamAccount.teamId,
    userId: account.user.id,
    userLevel: input.userLevel,
    ssoSubject: input.ssoSubject ?? null,
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

const it = base.extend<{
  plan: Plan;
  teamAccount: Account;
  owner: Viewer;
  member: Viewer;
  samlMember: Viewer;
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
    const viewer = await createTeamUser({
      teamAccount,
      userLevel: "member",
      ssoSubject: SSO_SUBJECT,
    });
    await factory.UserEmail.create({
      userId: viewer.user.id,
      email: EMAIL,
      verified: true,
    });
    await use(viewer);
  },
});

async function graphql(
  caller: Viewer | SessionCaller | null,
  query: string,
  variables: Record<string, unknown>,
) {
  const isSession = caller !== null && "cookie" in caller;
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

async function logInWithSaml(teamAccount: Account): Promise<SessionCaller> {
  const res = await exchangeSamlCode({
    teamAccount,
    email: EMAIL,
    ssoSubject: SSO_SUBJECT,
  });
  expect(res.status).toBe(200);
  return getSessionCaller(res);
}

async function logInWithEmail(): Promise<SessionCaller> {
  const res = await graphql(
    null,
    `
      mutation AuthenticateWithEmail($input: AuthFromEmailInput!) {
        authenticateWithEmail(input: $input) {
          creation
        }
      }
    `,
    { input: { email: EMAIL, code: await generateAuthEmailCode(EMAIL) } },
  );
  expectNoGraphQLError(res);
  return getSessionCaller(res);
}

function expectAccountVisible(res: request.Response, account: Account) {
  expectNoGraphQLError(res);
  expect(res.body.data.account.id).toBe(account.id);
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

    expectAccountVisible(res, teamAccount);
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

    expectAccountVisible(res, teamAccount);
  });

  it("satisfies only the team whose IdP opened the session", async ({
    plan,
    teamAccount,
    samlMember,
  }) => {
    const otherTeamAccount = await createSamlEnforcedTeam(plan);
    invariant(otherTeamAccount.teamId, "team account has no team");
    await factory.TeamUser.create({
      teamId: otherTeamAccount.teamId,
      userId: samlMember.user.id,
      userLevel: "member",
      ssoSubject: SSO_SUBJECT,
    });
    // The member has been through the other team's IdP too, on another device.
    const otherTeamSession = await logInWithSaml(otherTeamAccount);

    const session = await logInWithSaml(teamAccount);

    const res = await queryAccount(session, teamAccount.slug);
    expectAccountVisible(res, teamAccount);
    expect(res.body.data.account.viewerSignedInWithSaml).toBe(true);
    expectSamlRequired(await queryAccount(session, otherTeamAccount.slug));
    expectAccountVisible(
      await queryAccount(otherTeamSession, otherTeamAccount.slug),
      otherTeamAccount,
    );
  });

  it("keeps a SAML session through a login with another method elsewhere", async ({
    teamAccount,
    samlMember: _samlMember,
  }) => {
    const samlSession = await logInWithSaml(teamAccount);

    const emailSession = await logInWithEmail();

    const res = await queryAccount(samlSession, teamAccount.slug);
    expectAccountVisible(res, teamAccount);
    expectSamlRequired(await queryAccount(emailSession, teamAccount.slug));
  });
});
