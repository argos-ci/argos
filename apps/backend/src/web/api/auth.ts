import { invariant } from "@argos/util/invariant";
import axios from "axios";
import express, { Router } from "express";
import { z } from "zod";

import { AuthPayload } from "@/auth/request";
import { consumeSamlAuthCode } from "@/auth/saml";
import config from "@/config";
import type { Account } from "@/database/models";
import { Account as AccountModel } from "@/database/models";
import {
  createJWTFromAccount,
  getOrCreateUserAccountFromGhAccount,
  getOrCreateUserAccountFromGitlabUser,
  getOrCreateUserAccountFromGoogleUser,
  joinSSOTeams,
  markUserLastAuthMethod,
} from "@/database/services/account";
import { getOrCreateGhAccountFromGhProfile } from "@/database/services/github";
import { getOrCreateGitlabUser } from "@/database/services/gitlabUser";
import { getOrCreateGoogleUser } from "@/database/services/googleUser";
import {
  getTokenOctokit,
  retrieveOAuthToken as retrieveGithubOAuthToken,
} from "@/github";
import {
  getGitlabClient,
  retrieveOAuthToken as retrieveGitlabOAuthToken,
} from "@/gitlab";
import { getGoogleAuthenticatedClient, getGoogleUserProfile } from "@/google";

import { auth } from "../middlewares/auth";
import { allowApp } from "../middlewares/cors";
import { allowOnlyPost } from "../middlewares/methods";
import { asyncHandler } from "../util";

const router: Router = Router();

export default router;

const OAuthBodySchema = z.object({
  code: z.string(),
});
const SamlBodySchema = z.object({
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
    allowApp,
    allowOnlyPost,
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

router.use(
  "/auth/github",
  withOAuth(async (body, auth) => {
    const result = await retrieveGithubOAuthToken({
      clientId: config.get("github.clientId"),
      clientSecret: config.get("github.clientSecret"),
      code: body.code,
      redirectUri: `${config.get("server.url")}/auth/github/callback`,
    });

    const octokit = getTokenOctokit({
      token: result.access_token,
      proxy: false,
    });
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
    const account = await getOrCreateUserAccountFromGhAccount({
      ghAccount,
      attachToAccount: auth?.account ?? null,
    });
    invariant(account.userId, "Expected account to have userId");
    await joinSSOTeams({
      githubAccountId: ghAccount.id,
      userId: account.userId,
    });
    if (!auth) {
      await markUserLastAuthMethod({
        userId: account.userId,
        method: "github",
      });
    }
    return account;
  }),
);

router.use(
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
    invariant(account.userId, "Expected account to have userId");
    if (!auth) {
      await markUserLastAuthMethod({
        userId: account.userId,
        method: "gitlab",
      });
    }
    return account;
  }),
);

router.use(
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
    invariant(account.userId, "Expected account to have userId");
    if (!auth) {
      await markUserLastAuthMethod({
        userId: account.userId,
        method: "google",
      });
    }
    return account;
  }),
);

router.use(
  "/auth/saml",
  allowApp,
  allowOnlyPost,
  express.json(),
  asyncHandler(async (req, res) => {
    const parsed = SamlBodySchema.parse(req.body);
    const payload = await consumeSamlAuthCode(parsed.code);
    if (!payload) {
      res.status(401).send({
        error: {
          message: "Invalid or expired SAML auth code.",
        },
      });
      return;
    }
    const account = await AccountModel.query()
      .findById(payload.accountId)
      .throwIfNotFound();
    res.send({
      jwt: createJWTFromAccount(account),
      redirect: payload.redirect,
    });
  }),
);
