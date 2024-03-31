import { invariant } from "@argos/util/invariant";
import axios from "axios";
import bodyParser from "body-parser";
import cors from "cors";
import { Router } from "express";

import { createJWT } from "@/auth/jwt.js";
import config from "@/config/index.js";
import type { Account } from "@/database/models/index.js";
import {
  getOrCreateAccountFromGoogleUserProfile,
  getOrCreateGhAccountFromGhProfile,
  getOrCreateUserAccountFromGhAccount,
  getOrCreateUserAccountFromGitlabUser,
  joinSSOTeams,
} from "@/database/services/account.js";
import { getOrCreateGitlabUser } from "@/database/services/gitlabUser.js";
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

import { asyncHandler } from "../util.js";

const router = Router();

export default router;

// @TODO be more restrictive on cors
router.use(cors());

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

function handleOAuth(retrieveAccount: (body: any) => Promise<Account>) {
  return asyncHandler(async (req, res) => {
    try {
      const account = await retrieveAccount(req.body);
      res.send({ jwt: createJWTFromAccount(account) });
    } catch (error) {
      if (error instanceof axios.AxiosError && error.response) {
        res.status(error.response.status);
        return;
      }
      throw error;
    }
  });
}

router.post(
  "/auth/github",
  bodyParser.json(),
  handleOAuth(async (body) => {
    const result = await retrieveGithubOAuthToken({
      clientId: config.get("github.clientId"),
      clientSecret: config.get("github.clientSecret"),
      code: body.code,
    });

    const octokit = getTokenOctokit(result.access_token);
    const [profile, emails] = await Promise.all([
      octokit.users.getAuthenticated(),
      octokit.users.listEmailsForAuthenticatedUser(),
    ]);
    const ghAccount = await getOrCreateGhAccountFromGhProfile(
      profile.data,
      emails.data,
    );
    const account = await getOrCreateUserAccountFromGhAccount(
      ghAccount,
      result.access_token,
    );
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
  bodyParser.json(),
  handleOAuth(async (body) => {
    const response = await retrieveGitlabOAuthToken({
      clientId: config.get("gitlab.appId"),
      clientSecret: config.get("gitlab.appSecret"),
      code: body.code,
      redirectUri: `${config.get(
        "server.url",
      )}/auth/gitlab/callback?r=${encodeURIComponent(body.r)}`,
    });

    const api = getGitlabClient({
      accessToken: response.access_token,
    });
    const apiUser = await api.Users.showCurrentUser();
    const glUser = await getOrCreateGitlabUser(apiUser, {
      accessToken: response.access_token,
      accessTokenExpiresAt: new Date(Date.now() + response.expires_in * 1000),
      refreshToken: response.refresh_token,
    });
    const account = await getOrCreateUserAccountFromGitlabUser(glUser);
    return account;
  }),
);

router.post(
  "/auth/google",
  bodyParser.json(),
  handleOAuth(async (body) => {
    const oAuth2Client = await getGoogleAuthenticatedClient({
      code: body.code,
    });
    const profile = await getGoogleUserProfile({ oAuth2Client });
    const account = await getOrCreateAccountFromGoogleUserProfile(profile);
    return account;
  }),
);
