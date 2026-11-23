import { addDays } from "@argos/util/date";
import { invariant } from "@argos/util/invariant";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { getCallbackCookieName } from "@/auth/callback-binding";
import { createSamlAuthCode } from "@/auth/saml";
import { createSession, resolveSession } from "@/auth/session";
import { SESSION_COOKIE_NAME } from "@/auth/session-cookie";
import { Account, TeamInvite, TeamUser, UserEmail } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import oauthRouter from "../auth-oauth";
import { createTestApp, failUnhandledExceptLoopback } from "../test-util";
import router from "./auth";
import { bindSamlCallbackState, exchangeSamlCode } from "./auth.test-util";

const EMAIL = "jane@acme.com";
const SSO_SUBJECT = "idp-jane";
const GITHUB_ID = 4242;

const githubServer = setupServer(
  http.post("https://github.com/login/oauth/access_token", () =>
    HttpResponse.json({
      access_token: "gho_test",
      token_type: "bearer",
      scope: "user:email",
    }),
  ),
  http.get("https://api.github.com/user", () =>
    HttpResponse.json({
      id: GITHUB_ID,
      login: "octocat",
      name: "Octo Cat",
      email: null,
      type: "User",
    }),
  ),
  http.get("https://api.github.com/user/emails", () =>
    HttpResponse.json([
      {
        email: "octocat@example.com",
        primary: true,
        verified: true,
        visibility: null,
      },
    ]),
  ),
);

beforeAll(() => {
  githubServer.listen({ onUnhandledFrame: failUnhandledExceptLoopback });
});

afterAll(() => {
  githubServer.close();
});

const app = createTestApp(router);

const samlTest = test.extend<{ samlTeamAccount: Account }>({
  samlTeamAccount: async ({}, use) => {
    await setupDatabase();
    await use(await factory.TeamAccount.create());
  },
});

const oauthTest = test.extend<{ userAccount: Account; sessionCookie: string }>({
  userAccount: async ({}, use) => {
    await setupDatabase();
    await use(await factory.UserAccount.create({ githubAccountId: null }));
  },
  sessionCookie: async ({ userAccount }, use) => {
    invariant(userAccount.userId, "user account has no user");
    const { rawToken } = await createSession({
      userId: userAccount.userId,
      method: "email",
    });
    await use(`${SESSION_COOKIE_NAME}=${rawToken}`);
  },
});

/**
 * Start a GitHub login the way a login button does, and return the state sent
 * to GitHub with the cookies set in the browser that started it.
 */
async function startGitHubLogin(options?: { reauthenticate?: boolean }) {
  const res = await request(createTestApp(oauthRouter))
    .get("/auth/github/login")
    .query({
      r: "/settings",
      ...(options?.reauthenticate && { reauthenticate: "true" }),
    });
  expect(res.status).toBe(302);
  const location = res.headers["location"];
  invariant(location, "Expected a redirect to GitHub");
  const state = new URL(location).searchParams.get("state");
  invariant(state, "Expected a state in the redirect");
  const cookies = (res.get("Set-Cookie") ?? []).map(
    (cookie) => cookie.split(";")[0] ?? "",
  );
  return { state, cookies };
}

function postGitHubCallback(input: {
  cookies: string[];
  code: string;
  state: string;
}) {
  return request(createTestApp(router))
    .post("/auth/github")
    .set("Cookie", input.cookies)
    .set("X-Argos-CSRF", "1")
    .send({ code: input.code, state: input.state });
}

/** The session a response opened, if it set one. */
async function getOpenedSession(res: request.Response) {
  const cookie = (res.get("Set-Cookie") ?? []).find((header) =>
    header.startsWith(`${SESSION_COOKIE_NAME}=`),
  );
  if (!cookie) {
    return null;
  }
  const rawToken = cookie.split(";")[0]?.slice(SESSION_COOKIE_NAME.length + 1);
  invariant(rawToken, "malformed session cookie");
  return resolveSession(rawToken);
}

async function getLinkedGithubId(account: Account) {
  const fetched = await Account.query()
    .findById(account.id)
    .withGraphFetched("githubAccount")
    .throwIfNotFound();
  return fetched.githubAccount?.githubId ?? null;
}

describe("POST /auth/github", () => {
  oauthTest(
    "links GitHub to the signed-in account that started the login",
    async ({ userAccount, sessionCookie }) => {
      const login = await startGitHubLogin();

      const res = await postGitHubCallback({
        cookies: [sessionCookie, ...login.cookies],
        code: "code",
        state: login.state,
      });

      expect(res.status).toBe(200);
      expect(await getLinkedGithubId(userAccount)).toBe(GITHUB_ID);
      // Linking keeps the session the user signed in with.
      expect(await getOpenedSession(res)).toBeNull();
    },
  );

  oauthTest(
    "opens a GitHub session when the signed-in user signs in again",
    async ({ userAccount, sessionCookie }) => {
      const login = await startGitHubLogin({ reauthenticate: true });

      const res = await postGitHubCallback({
        cookies: [sessionCookie, ...login.cookies],
        code: "code",
        state: login.state,
      });

      expect(res.status).toBe(200);
      expect(await getLinkedGithubId(userAccount)).toBe(GITHUB_ID);
      expect(await getOpenedSession(res)).toMatchObject({
        userId: userAccount.userId,
        authMethod: "github",
      });
      // The session it replaces in this browser no longer works anywhere.
      const replacedToken = sessionCookie.split("=")[1];
      invariant(replacedToken, "malformed session cookie");
      expect(await resolveSession(replacedToken)).toBeNull();
    },
  );

  oauthTest(
    "does not link a code from a login another browser started",
    async ({ userAccount, sessionCookie }) => {
      // The attacker's own login: a genuine state, bound to their browser.
      const attackerLogin = await startGitHubLogin();

      const res = await postGitHubCallback({
        cookies: [sessionCookie],
        code: "attacker-code",
        state: attackerLogin.state,
      });

      expect(res.status).toBe(401);
      expect(await getLinkedGithubId(userAccount)).toBeNull();
    },
  );
});

const signedInTest = samlTest.extend<{
  userId: string;
  sessionToken: string;
}>({
  userId: async ({ samlTeamAccount: _ }, use) => {
    const { userId } = await factory.UserAccount.create();
    invariant(userId, "user account has no user");
    await factory.UserEmail.create({ userId, email: EMAIL, verified: true });
    await use(userId);
  },
  sessionToken: async ({ userId }, use) => {
    const { rawToken } = await createSession({ userId, method: "email" });
    await use(rawToken);
  },
});

function createCode(teamAccount: Account) {
  return createSamlAuthCode({
    teamAccountId: teamAccount.id,
    email: EMAIL,
    ssoSubject: SSO_SUBJECT,
  });
}

/**
 * What the callback page sends, from the browser `state` is bound to, signed
 * in when there is a `sessionToken`.
 */
function exchange(input: {
  code: string;
  state: { state: string; cookie: string };
  sessionToken: string | null;
  confirmLink?: true;
}) {
  const cookies = [input.state.cookie];
  if (input.sessionToken) {
    cookies.push(`${SESSION_COOKIE_NAME}=${input.sessionToken}`);
  }
  return request(app)
    .post("/auth/saml")
    .set("X-Argos-CSRF", "1")
    .set("Cookie", cookies)
    .send({
      code: input.code,
      state: input.state.state,
      confirmLink: input.confirmLink,
    });
}

/**
 * The state a response bound to the browser for the next request, the one
 * that wins among the cookies it set.
 */
function getReissuedState(res: request.Response) {
  const state: unknown = res.body.error?.state;
  invariant(typeof state === "string", "Expected a state in the response");
  const name = getCallbackCookieName("saml");
  const cookie = (res.get("Set-Cookie") ?? [])
    .map((header) => header.split(";")[0] ?? "")
    .findLast((pair) => pair.startsWith(`${name}=`));
  invariant(cookie, "Expected the state to be bound to the browser");
  expect(decodeURIComponent(cookie.slice(name.length + 1))).toBe(state);
  return { state, cookie };
}

function findTeamUser(teamAccount: Account, userId: string) {
  invariant(teamAccount.teamId, "team account has no team");
  return TeamUser.query().findOne({ teamId: teamAccount.teamId, userId });
}

async function createTeamWithDomain(domain: string) {
  const teamAccount = await factory.TeamAccount.create();
  invariant(teamAccount.teamId, "team account has no team");
  await factory.TeamDomain.create({ teamId: teamAccount.teamId, domain });
  return teamAccount;
}

async function invite(input: {
  teamAccount: Account;
  userLevel: TeamInvite["userLevel"];
}) {
  invariant(input.teamAccount.teamId, "team account has no team");
  const inviter = await factory.User.create();
  await TeamInvite.query().insert({
    teamId: input.teamAccount.teamId,
    email: EMAIL,
    secret: TeamInvite.generateSecret(),
    userLevel: input.userLevel,
    invitedById: inviter.id,
    expiresAt: addDays(new Date(), 1).toISOString(),
  });
}

describe("POST /auth/saml", () => {
  samlTest(
    "sends an account it creates on one of the team's domains through the signup flow",
    async ({ samlTeamAccount }) => {
      invariant(samlTeamAccount.teamId, "team account has no team");
      await factory.TeamDomain.create({
        teamId: samlTeamAccount.teamId,
        domain: "acme.com",
      });
      await createTeamWithDomain("acme.com");

      const res = await exchangeSamlCode({
        teamAccount: samlTeamAccount,
        email: EMAIL,
        ssoSubject: SSO_SUBJECT,
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ creation: true, hasAutoInvite: true });
      expect(await UserEmail.query().findById(EMAIL)).toMatchObject({
        verified: true,
      });
    },
  );

  samlTest(
    "gives an account it creates the email unverified off the team's domains",
    async ({ samlTeamAccount }) => {
      await createTeamWithDomain("acme.com");
      const invitingTeam = await factory.TeamAccount.create();
      await invite({ teamAccount: invitingTeam, userLevel: "owner" });
      await invite({ teamAccount: samlTeamAccount, userLevel: "contributor" });

      const res = await exchangeSamlCode({
        teamAccount: samlTeamAccount,
        email: EMAIL,
        ssoSubject: SSO_SUBJECT,
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ creation: true, hasAutoInvite: false });
      const userEmail = await UserEmail.query()
        .findById(EMAIL)
        .throwIfNotFound();
      expect(userEmail.verified).toBe(false);
      // The team's own invite still applies; other teams' wait for the
      // person to prove the email is theirs.
      expect(
        await findTeamUser(samlTeamAccount, userEmail.userId),
      ).toMatchObject({ userLevel: "contributor", ssoSubject: SSO_SUBJECT });
      expect(
        await findTeamUser(invitingTeam, userEmail.userId),
      ).toBeUndefined();
      expect(await TeamInvite.query().where("email", EMAIL)).toMatchObject([
        { teamId: invitingTeam.teamId, userLevel: "owner" },
      ]);
    },
  );

  signedInTest(
    "links the signed-in user's account only once they confirm it",
    async ({ samlTeamAccount, userId, sessionToken }) => {
      const code = await createCode(samlTeamAccount);

      const unconfirmed = await exchange({
        code,
        state: bindSamlCallbackState(),
        sessionToken,
      });
      expect(unconfirmed.status).toBe(403);
      expect(unconfirmed.body.error).toMatchObject({
        code: "SAML_LINK_CONFIRMATION_REQUIRED",
        teamName: samlTeamAccount.displayName,
      });
      expect(await getOpenedSession(unconfirmed)).toBeNull();
      expect(await findTeamUser(samlTeamAccount, userId)).toBeUndefined();

      const confirmed = await exchange({
        code,
        state: getReissuedState(unconfirmed),
        sessionToken,
        confirmLink: true,
      });
      expect(confirmed.status).toBe(200);
      expect(await findTeamUser(samlTeamAccount, userId)).toMatchObject({
        ssoSubject: SSO_SUBJECT,
      });

      const replayed = await exchange({
        code,
        state: bindSamlCallbackState(),
        sessionToken,
        confirmLink: true,
      });
      expect(replayed.status).toBe(401);
    },
  );

  signedInTest(
    "refuses a confirmation that comes without the account's session",
    async ({ samlTeamAccount, userId, sessionToken }) => {
      const code = await createCode(samlTeamAccount);
      const unconfirmed = await exchange({
        code,
        state: bindSamlCallbackState(),
        sessionToken,
      });
      expect(unconfirmed.status).toBe(403);

      const res = await exchange({
        code,
        state: getReissuedState(unconfirmed),
        sessionToken: null,
        confirmLink: true,
      });
      expect(res.status).toBe(403);
      expect(res.text).toContain("An Argos account already uses");
      expect(await findTeamUser(samlTeamAccount, userId)).toBeUndefined();
    },
  );

  signedInTest(
    "signs in a user already linked to the SSO subject without asking",
    async ({ samlTeamAccount, userId, sessionToken }) => {
      invariant(samlTeamAccount.teamId, "team account has no team");
      await factory.TeamUser.create({
        teamId: samlTeamAccount.teamId,
        userId,
        userLevel: "member",
        ssoSubject: SSO_SUBJECT,
      });

      for (const token of [sessionToken, null]) {
        const res = await exchange({
          code: await createCode(samlTeamAccount),
          state: bindSamlCallbackState(),
          sessionToken: token,
        });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ creation: false, hasAutoInvite: false });
      }
    },
  );

  samlTest(
    "rejects a code exchanged in another browser than the one the ACS bound it to",
    async ({ samlTeamAccount }) => {
      const res = await exchangeSamlCode({
        teamAccount: samlTeamAccount,
        email: EMAIL,
        ssoSubject: SSO_SUBJECT,
        fromAnotherBrowser: true,
      });

      expect(res.status).toBe(401);
    },
  );
});
