import { invariant } from "@argos/util/invariant";
import axios from "axios";
import cors from "cors";
import express, { Router } from "express";
import { z } from "zod";

import { createJWT } from "@/auth/jwt.js";
import { AuthPayload } from "@/auth/request.js";
import config from "@/config/index.js";
import type { Account } from "@/database/models/index.js";
import {
  getOrCreateGhAccountFromGhProfile,
  getOrCreateUserAccountFromGhAccount,
  getOrCreateUserAccountFromGitlabUser,
  getOrCreateUserAccountFromGoogleUser,
  joinSSOTeams,
} from "@/database/services/account.js";
import { getOrCreateGitlabUser } from "@/database/services/gitlabUser.js";
import { getOrCreateGoogleUser } from "@/database/services/googleUser.js";
import {
  getTokenOctokit,
  retrieveOAuthToken as retrieveGithubOAuthToken,
} from "@/github/index.js";
import {
  getGitlabClient,
  retrieveOAuthToken as retrieveGitlabOAuthToken,
} from "@/gitlab/index.js";
import {
  getGoogleAuthenticatedClient,
  getGoogleUserProfile,
} from "@/google/index.js";

import { auth } from "../middlewares/auth.js";
import { asyncHandler } from "../util.js";

const router: Router = Router();

export default router;

function createJWTFromAccount(account: Account) {
  return createJWT({
    version: 1,
    account: {
      id: account.id,
      name: account.name,
      slug: account.slug,
    },
  });
}

const OAuthBodySchema = z.object({
  code: z.string(),
});

type OAuthBody = z.infer<typeof OAuthBodySchema>;

/**
 * Create an OAuth handler.
 */
function withOAuth(
  retrieveAccount: (
    body: OAuthBody,
    auth: AuthPayload | null,
  ) => Promise<Account>,
): express.RequestHandler[] {
  return [
    cors(),
    auth,
    express.json(),
    asyncHandler(async (req, res) => {
      try {
        const parsed = OAuthBodySchema.parse(req.body);
        const account = await retrieveAccount(parsed, req.auth ?? null);
        res.send({ jwt: createJWTFromAccount(account) });
      } catch (error) {
        if (error instanceof axios.AxiosError && error.response) {
          res.status(error.response.status);
          return;
        }
        throw error;
      }
    }),
  ];
}

router.post(
  "/auth/github",
  withOAuth(async (body, auth) => {
    const result = await retrieveGithubOAuthToken({
      clientId: config.get("github.clientId"),
      clientSecret: config.get("github.clientSecret"),
      code: body.code,
      redirectUri: `${config.get("server.url")}/auth/github/callback`,
    });

    const octokit = getTokenOctokit(result.access_token);
    const [profile, emails] = await Promise.all([
      octokit.users.getAuthenticated(),
      octokit.users.listEmailsForAuthenticatedUser(),
    ]);
    const ghAccount = await getOrCreateGhAccountFromGhProfile(
      profile.data,
      emails.data,
      {
        accessToken: result.access_token,
        lastLoggedAt: new Date().toISOString(),
        scope: result.scope,
      },
    );
    const account = await getOrCreateUserAccountFromGhAccount(ghAccount, {
      attachToAccount: auth?.account ?? null,
    });
    invariant(account.userId, "Expected account to have userId");
    await joinSSOTeams({
      githubAccountId: ghAccount.id,
      userId: account.userId,
    });
    return account;
  }),
);

router.post(
  "/auth/gitlab",
  withOAuth(async (body, auth) => {
    const response = await retrieveGitlabOAuthToken({
      clientId: config.get("gitlab.appId"),
      clientSecret: config.get("gitlab.appSecret"),
      code: body.code,
      redirectUri: `${config.get("server.url")}/auth/gitlab/callback`,
    });

    const api = getGitlabClient({ accessToken: response.access_token });
    const apiUser = await api.Users.showCurrentUser();
    const gitlabUser = await getOrCreateGitlabUser(apiUser, {
      accessToken: response.access_token,
      accessTokenExpiresAt: new Date(Date.now() + response.expires_in * 1000),
      refreshToken: response.refresh_token,
      lastLoggedAt: new Date().toISOString(),
    });
    const account = await getOrCreateUserAccountFromGitlabUser({
      gitlabUser,
      attachToAccount: auth?.account ?? null,
    });
    return account;
  }),
);

router.post(
  "/auth/google",
  withOAuth(async (body, auth) => {
    const client = await getGoogleAuthenticatedClient({
      code: body.code,
      clientId: config.get("google.clientId"),
      clientSecret: config.get("google.clientSecret"),
      redirectUri: `${config.get("server.url")}/auth/google/callback`,
    });
    const profile = await getGoogleUserProfile({ client });
    const googleUser = await getOrCreateGoogleUser(profile, {
      lastLoggedAt: new Date().toISOString(),
    });
    const account = await getOrCreateUserAccountFromGoogleUser({
      googleUser,
      attachToAccount: auth?.account ?? null,
    });
    return account;
  }),
);
