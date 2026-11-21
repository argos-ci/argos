import { createHash } from "node:crypto";
import type { ErrorCode } from "@argos/error-types";
import type { TeamAuthMethod } from "@argos/schemas/team-auth-method";
import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import { getProject } from "@/api/handlers/getProject";
import { createTestHandlerApp } from "@/api/test-util";
import type { AuthMethod } from "@/auth/auth-method";
import { generateAuthEmailCode } from "@/auth/email";
import { createSession } from "@/auth/session";
import { SESSION_COOKIE_NAME } from "@/auth/session-cookie";
import {
  OAuthClient,
  Plan,
  Team,
  TeamSamlConfig,
  UserAccessToken,
  UserAccessTokenScope,
  type Account,
  type Project,
  type TeamUser,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { consumeAuthorizationCode } from "@/oauth/authorization-code";
import { issueTokens } from "@/oauth/tokens";
import { setupRedis } from "@/util/redis/testing";
import { exchangeSamlCode } from "@/web/api/auth.test-util";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp, type MockedViewer } from "./util";

setupRedis();

const EMAIL = "jane@acme.com";
const SSO_SUBJECT = "idp-jane";

/** A request made with a real session cookie rather than a mocked viewer. */
type SessionCaller = { cookie: string };

async function createTeamUser(input: {
  teamAccount: Account;
  userLevel: TeamUser["userLevel"];
  ssoSubject?: string;
}): Promise<MockedViewer> {
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
  });
  await requireAuthMethod(teamAccount, "saml");
  return teamAccount;
}

async function requireAuthMethod(
  teamAccount: Account,
  authMethod: TeamAuthMethod,
) {
  invariant(teamAccount.teamId, "team account has no team");
  await Team.query()
    .findById(teamAccount.teamId)
    .patch({ enforcedAuthMethod: authMethod });
}

const it = base.extend<{
  plan: Plan;
  teamAccount: Account;
  owner: MockedViewer;
  member: MockedViewer;
  samlMember: MockedViewer;
  /** A team requiring no sign-in method, on no plan. */
  freeTeamAccount: Account;
  freeTeamOwner: MockedViewer;
  freeTeamMember: MockedViewer;
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
  freeTeamAccount: async ({}, use) => {
    await setupDatabase();
    await use(await factory.TeamAccount.create());
  },
  freeTeamOwner: async ({ freeTeamAccount }, use) => {
    await use(
      await createTeamUser({
        teamAccount: freeTeamAccount,
        userLevel: "owner",
      }),
    );
  },
  freeTeamMember: async ({ freeTeamAccount }, use) => {
    await use(
      await createTeamUser({
        teamAccount: freeTeamAccount,
        userLevel: "member",
      }),
    );
  },
});

async function graphql(
  caller: MockedViewer | SessionCaller | null,
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

function queryAccount(caller: MockedViewer | SessionCaller, slug: string) {
  return graphql(
    caller,
    `
      query Account($slug: String!) {
        account(slug: $slug) {
          id
          ... on Team {
            viewerAuthMethod
          }
        }
      }
    `,
    { slug },
  );
}

/** Configure SAML as an owner signed in with it, as the settings page needs. */
async function setTeamSamlEnabled(
  owner: MockedViewer,
  teamAccount: Account,
  enabled: boolean,
) {
  invariant(teamAccount.teamId, "team account has no team");
  const res = await graphql(
    { ...owner, samlTeamId: teamAccount.teamId },
    `
      mutation ConfigureTeamSaml($input: ConfigureTeamSamlInput!) {
        configureTeamSaml(input: $input) {
          id
          enabled
        }
      }
    `,
    { input: { teamAccountId: teamAccount.id, enabled } },
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

const REQUIRED_CODES = {
  google: "GOOGLE_AUTH_REQUIRED",
  github: "GITHUB_AUTH_REQUIRED",
  saml: "SAML_SSO_REQUIRED",
} satisfies Record<TeamAuthMethod, ErrorCode>;

/** The field `field` is withheld with a prompt to sign in with `authMethod`. */
function expectAuthMethodRequired(
  res: request.Response,
  authMethod: TeamAuthMethod,
  field: "account" | "project" | "me" = "account",
) {
  expect(res.body.data[field]).toBeNull();
  expect(res.body.errors[0].extensions.argosErrorCode).toBe(
    REQUIRED_CODES[authMethod],
  );
}

/** The field `field` is withheld with a prompt to sign in with SAML. */
function expectSamlRequired(
  res: request.Response,
  field: "account" | "project" | "me" = "account",
) {
  expectAuthMethodRequired(res, "saml", field);
}

/** A real session for `viewer`, as a login with `method` opens. */
async function openSession(
  viewer: MockedViewer,
  method: Exclude<AuthMethod, "saml">,
): Promise<SessionCaller> {
  const { rawToken } = await createSession({ userId: viewer.user.id, method });
  return { cookie: `${SESSION_COOKIE_NAME}=${rawToken}` };
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
    await setTeamSamlEnabled(owner, teamAccount, false);

    const res = await queryAccount(member, teamAccount.slug);

    expectAccountVisible(res, teamAccount);
  });

  it("requires SAML again once it is re-enabled", async ({
    teamAccount,
    owner,
    member,
  }) => {
    await setTeamSamlEnabled(owner, teamAccount, false);
    await setTeamSamlEnabled(owner, teamAccount, true);

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
    expect(res.body.data.account.viewerAuthMethod).toBe("saml");
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

function queryProject(
  caller: MockedViewer | SessionCaller,
  accountSlug: string,
  projectName: string,
) {
  return graphql(
    caller,
    `
      query Project($accountSlug: String!, $projectName: String!) {
        project(accountSlug: $accountSlug, projectName: $projectName) {
          id
          permissions
        }
      }
    `,
    { accountSlug, projectName },
  );
}

function queryTeamProjects(caller: SessionCaller) {
  return graphql(
    caller,
    `
      query TeamProjects {
        me {
          teams {
            projects(first: 10, after: 0) {
              edges {
                id
              }
            }
          }
        }
      }
    `,
    {},
  );
}

function createTeamProject(teamAccount: Account, input: { private: boolean }) {
  return factory.Project.create({
    accountId: teamAccount.id,
    private: input.private,
  });
}

describe("GraphQL team SAML enforcement on projects", () => {
  it("requires SAML from members reaching a team project", async ({
    teamAccount,
    samlMember: _samlMember,
  }) => {
    const project = await createTeamProject(teamAccount, { private: true });
    const emailSession = await logInWithEmail();
    const samlSession = await logInWithSaml(teamAccount);

    const samlRes = await queryProject(
      samlSession,
      teamAccount.slug,
      project.name,
    );
    expectNoGraphQLError(samlRes);
    expect(samlRes.body.data.project.id).toBe(project.id);

    const res = await queryProject(
      emailSession,
      teamAccount.slug,
      project.name,
    );
    expectSamlRequired(res, "project");
  });

  it("shows a public team project to members as it does to anyone", async ({
    teamAccount,
    samlMember: _samlMember,
  }) => {
    const project = await createTeamProject(teamAccount, { private: false });
    const emailSession = await logInWithEmail();

    const res = await queryProject(
      emailSession,
      teamAccount.slug,
      project.name,
    );

    expectNoGraphQLError(res);
    expect(res.body.data.project).toEqual({
      id: project.id,
      permissions: ["view"],
    });
  });

  it("lists the team's projects only to members signed in with SAML", async ({
    teamAccount,
    samlMember: _samlMember,
  }) => {
    const project = await createTeamProject(teamAccount, { private: true });
    const emailSession = await logInWithEmail();
    const samlSession = await logInWithSaml(teamAccount);

    const samlRes = await queryTeamProjects(samlSession);
    expectNoGraphQLError(samlRes);
    expect(samlRes.body.data.me.teams).toEqual([
      { projects: { edges: [{ id: project.id }] } },
    ]);

    const res = await queryTeamProjects(emailSession);
    expectSamlRequired(res, "me");
  });
});

const getProjectApp = createTestHandlerApp(getProject);

async function createPersonalAccessToken(
  session: SessionCaller,
  teamAccount: Account,
): Promise<string> {
  const res = await graphql(
    session,
    `
      mutation CreateToken($input: CreateUserAccessTokenInput!) {
        createUserAccessToken(input: $input) {
          token
        }
      }
    `,
    { input: { name: "ci", accountIds: [teamAccount.id] } },
  );
  expectNoGraphQLError(res);
  return res.body.data.createUserAccessToken.token;
}

async function createOAuthAccessToken(
  session: SessionCaller,
  teamAccount: Account,
): Promise<string> {
  const redirectUri = "http://localhost/callback";
  const client = await OAuthClient.query().insertAndFetch({
    clientId: `client-${teamAccount.id}-${Math.random()}`,
    clientName: "Test Client",
    redirectUris: [redirectUri],
    grantTypes: ["authorization_code", "refresh_token"],
    responseTypes: ["code"],
    tokenEndpointAuthMethod: "none",
    isFirstParty: false,
    verified: false,
  });
  const codeVerifier = "s".repeat(64);
  const res = await graphql(
    session,
    `
      mutation Authorize($input: AuthorizeOAuthConsentInput!) {
        authorizeOAuthConsent(input: $input) {
          redirectUri
        }
      }
    `,
    {
      input: {
        clientId: client.clientId,
        redirectUri,
        scopes: ["projects:read"],
        accountIds: [teamAccount.id],
        codeChallenge: createHash("sha256")
          .update(codeVerifier)
          .digest("base64url"),
        codeChallengeMethod: "S256",
      },
    },
  );
  expectNoGraphQLError(res);
  const code = new URL(
    res.body.data.authorizeOAuthConsent.redirectUri,
  ).searchParams.get("code");
  invariant(code, "consent returned no code");
  const payload = await consumeAuthorizationCode({
    code,
    codeVerifier,
    clientId: client.clientId,
    redirectUri,
  });
  invariant(payload, "code was not exchanged");
  const tokens = await issueTokens({
    grantId: payload.grantId,
    scopes: ["projects:read"],
    resource: payload.resource,
  });
  return tokens.accessToken;
}

function getProjectWithToken(
  token: string,
  teamAccount: Account,
  project: Project,
) {
  return request(getProjectApp)
    .get(`/projects/${teamAccount.slug}/${project.name}`)
    .set("Authorization", `Bearer ${token}`);
}

describe("REST API team SAML enforcement", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  for (const [kind, createToken] of [
    ["personal access token", createPersonalAccessToken],
    ["OAuth access token", createOAuthAccessToken],
  ] as const) {
    it(`accepts a ${kind} issued from a SAML session`, async ({
      teamAccount,
      samlMember: _samlMember,
    }) => {
      const project = await createTeamProject(teamAccount, { private: true });
      const token = await createToken(
        await logInWithSaml(teamAccount),
        teamAccount,
      );

      const res = await getProjectWithToken(token, teamAccount, project);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(project.id);
    });

    it(`refuses a ${kind} issued from another session`, async ({
      teamAccount,
      samlMember: _samlMember,
    }) => {
      const project = await createTeamProject(teamAccount, { private: true });
      const token = await createToken(await logInWithEmail(), teamAccount);

      const res = await getProjectWithToken(token, teamAccount, project);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/requires sign-in with SAML SSO/);
    });
  }

  it("keeps accepting a token authorized for the team before it was issued from SAML", async ({
    teamAccount,
    samlMember,
  }) => {
    // What the migration does for tokens that predate the rule.
    const project = await createTeamProject(teamAccount, { private: true });
    const token = await createPersonalAccessToken(
      await logInWithEmail(),
      teamAccount,
    );
    await UserAccessTokenScope.query()
      .patch({ authMethod: "saml" })
      .whereIn(
        "userAccessTokenId",
        UserAccessToken.query()
          .select("id")
          .where("userId", samlMember.user.id),
      );

    const res = await getProjectWithToken(token, teamAccount, project);

    expect(res.status).toBe(200);
  });
});

const SOCIAL_AUTH_METHODS = ["google", "github"] as const;

describe("team requiring a social sign-in", () => {
  beforeAll(() => {
    z.globalRegistry.clear();
  });

  for (const authMethod of SOCIAL_AUTH_METHODS) {
    it(`requires ${authMethod} from members signed in another way`, async ({
      freeTeamAccount,
      freeTeamMember,
    }) => {
      await requireAuthMethod(freeTeamAccount, authMethod);

      const res = await queryAccount(freeTeamMember, freeTeamAccount.slug);

      expectAuthMethodRequired(res, authMethod);
    });

    it(`lets members signed in with ${authMethod} in`, async ({
      freeTeamAccount,
      freeTeamMember,
    }) => {
      await requireAuthMethod(freeTeamAccount, authMethod);

      const res = await queryAccount(
        { ...freeTeamMember, authMethod },
        freeTeamAccount.slug,
      );

      expectAccountVisible(res, freeTeamAccount);
      expect(res.body.data.account.viewerAuthMethod).toBe(authMethod);
    });

    it(`accepts only tokens issued from a ${authMethod} session`, async ({
      freeTeamAccount,
      freeTeamMember,
    }) => {
      const project = await createTeamProject(freeTeamAccount, {
        private: true,
      });
      const socialToken = await createPersonalAccessToken(
        await openSession(freeTeamMember, authMethod),
        freeTeamAccount,
      );
      const emailToken = await createPersonalAccessToken(
        await openSession(freeTeamMember, "email"),
        freeTeamAccount,
      );
      await requireAuthMethod(freeTeamAccount, authMethod);

      const accepted = await getProjectWithToken(
        socialToken,
        freeTeamAccount,
        project,
      );
      expect(accepted.status).toBe(200);

      const refused = await getProjectWithToken(
        emailToken,
        freeTeamAccount,
        project,
      );
      expect(refused.status).toBe(403);
      expect(refused.body.error).toMatch(/requires sign-in with/);
    });
  }

  it("does not count a SAML login to the team as a social sign-in", async ({
    teamAccount,
    samlMember: _samlMember,
  }) => {
    await requireAuthMethod(teamAccount, "google");
    const samlSession = await logInWithSaml(teamAccount);

    const res = await queryAccount(samlSession, teamAccount.slug);

    expectAuthMethodRequired(res, "google");
  });
});

function setEnforcedAuthMethod(
  caller: MockedViewer,
  teamAccount: Account,
  authMethod: TeamAuthMethod | null,
) {
  return graphql(
    caller,
    `
      mutation SetTeamEnforcedAuthMethod(
        $input: SetTeamEnforcedAuthMethodInput!
      ) {
        setTeamEnforcedAuthMethod(input: $input) {
          id
          ... on Team {
            enforcedAuthMethod
          }
        }
      }
    `,
    { input: { teamAccountId: teamAccount.id, authMethod } },
  );
}

function expectForbidden(res: request.Response, message: string) {
  expect(res.body.data).toBeNull();
  expect(res.body.errors[0].extensions.code).toBe("FORBIDDEN");
  expect(res.body.errors[0].message).toBe(message);
}

describe("setTeamEnforcedAuthMethod", () => {
  it("requires the method the owner signed in with", async ({
    freeTeamAccount,
    freeTeamOwner,
    freeTeamMember,
  }) => {
    const res = await setEnforcedAuthMethod(
      { ...freeTeamOwner, authMethod: "github" },
      freeTeamAccount,
      "github",
    );

    expectNoGraphQLError(res);
    expect(res.body.data.setTeamEnforcedAuthMethod.enforcedAuthMethod).toBe(
      "github",
    );
    expectAuthMethodRequired(
      await queryAccount(freeTeamMember, freeTeamAccount.slug),
      "github",
    );
  });

  it("refuses a method the owner did not sign in with", async ({
    freeTeamAccount,
    freeTeamOwner,
    freeTeamMember,
  }) => {
    const res = await setEnforcedAuthMethod(
      { ...freeTeamOwner, authMethod: "github" },
      freeTeamAccount,
      "google",
    );

    expectForbidden(
      res,
      "You are not signed in with Google. Sign in with Google, then try again.",
    );
    expectAccountVisible(
      await queryAccount(freeTeamMember, freeTeamAccount.slug),
      freeTeamAccount,
    );
  });

  it("refuses SAML until the team has it enabled", async ({
    freeTeamAccount,
    freeTeamOwner,
  }) => {
    invariant(freeTeamAccount.teamId, "team account has no team");

    const res = await setEnforcedAuthMethod(
      { ...freeTeamOwner, samlTeamId: freeTeamAccount.teamId },
      freeTeamAccount,
      "saml",
    );

    expectForbidden(res, "Enable SAML SSO before requiring it.");
  });

  it("lets members sign in with any method again", async ({
    teamAccount,
    owner,
    member,
  }) => {
    invariant(teamAccount.teamId, "team account has no team");

    const res = await setEnforcedAuthMethod(
      { ...owner, samlTeamId: teamAccount.teamId },
      teamAccount,
      null,
    );

    expectNoGraphQLError(res);
    expectAccountVisible(
      await queryAccount(member, teamAccount.slug),
      teamAccount,
    );
  });

  it("stops requiring SAML once its configuration is removed", async ({
    teamAccount,
    owner,
    member,
  }) => {
    invariant(teamAccount.teamId, "team account has no team");

    const res = await graphql(
      { ...owner, samlTeamId: teamAccount.teamId },
      `
        mutation RemoveTeamSaml($teamAccountId: ID!) {
          removeTeamSaml(teamAccountId: $teamAccountId) {
            id
          }
        }
      `,
      { teamAccountId: teamAccount.id },
    );

    expectNoGraphQLError(res);
    const team = await Team.query()
      .findById(teamAccount.teamId)
      .throwIfNotFound();
    expect(team.enforcedAuthMethod).toBeNull();
    expectAccountVisible(
      await queryAccount(member, teamAccount.slug),
      teamAccount,
    );
  });
});
