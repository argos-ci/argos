import { invariant } from "@argos/util/invariant";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { createSession, resolveSession } from "@/auth/session";
import { SESSION_COOKIE_NAME } from "@/auth/session-cookie";
import { Account } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import oauthRouter from "../auth-oauth";
import { createTestApp, failUnhandledExceptLoopback } from "../test-util";
import router from "./auth";
import { exchangeSamlCode } from "./auth.test-util";

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

describe("POST /auth/saml", () => {
  samlTest(
    "sends an account it creates through the signup flow",
    async ({ samlTeamAccount }) => {
      const domainTeam = await factory.TeamAccount.create();
      invariant(domainTeam.teamId, "team account has no team");
      await factory.TeamDomain.create({
        teamId: domainTeam.teamId,
        domain: "acme.com",
      });

      const res = await exchangeSamlCode({
        teamAccount: samlTeamAccount,
        email: EMAIL,
        ssoSubject: SSO_SUBJECT,
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ creation: true, hasAutoInvite: true });
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
