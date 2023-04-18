import axios from "axios";
import bodyParser from "body-parser";
import cors from "cors";
import { Router } from "express";

import config from "@argos-ci/config";
import { transaction } from "@argos-ci/database";
import { Account, GithubAccount, User } from "@argos-ci/database/models";
import { RestEndpointMethodTypes, getTokenOctokit } from "@argos-ci/github";

import { createJWT } from "../jwt.js";
import { asyncHandler } from "../util.js";

const router = Router();

export default router;

// @TODO be more restrictive on cors
router.use(cors());

type Profile =
  RestEndpointMethodTypes["users"]["getAuthenticated"]["response"]["data"];

const getOrCreateGhAccount = async (profile: Profile) => {
  const existing = await GithubAccount.query().findOne({
    githubId: profile.id,
  });
  if (existing) {
    if (
      existing.login !== profile.login ||
      existing.email !== profile.email ||
      existing.name !== profile.name
    ) {
      return existing.$query().patchAndFetch({
        login: profile.login,
        email: profile.email,
        name: profile.name,
      });
    }
    return existing;
  }
  return GithubAccount.query().insertAndFetch({
    githubId: profile.id,
    login: profile.login,
    type: "user",
    email: profile.email,
    name: profile.name,
  });
};

const getOrCreateAccount = async (
  ghAccount: GithubAccount,
  accessToken: string
): Promise<Account> => {
  const existingAccount = await Account.query()
    .findOne({
      githubAccountId: ghAccount.id,
    })
    .withGraphFetched("user");

  if (existingAccount) {
    if (!existingAccount.user) {
      throw new Error("Invariant: user not found");
    }

    if (
      existingAccount.user.accessToken !== accessToken ||
      existingAccount.user.email !== ghAccount.email
    ) {
      await existingAccount.user.$query().patchAndFetch({
        accessToken,
        email: ghAccount.email,
      });
    }

    if (
      existingAccount.name !== ghAccount.name ||
      existingAccount.slug !== ghAccount.login
    ) {
      return existingAccount.$query().patchAndFetch({
        name: ghAccount.name,
        slug: ghAccount.login,
      });
    }

    return existingAccount;
  }

  return transaction(async (trx) => {
    const user = await User.query(trx).insertAndFetch({
      email: ghAccount.email,
      accessToken,
    });
    return Account.query(trx).insertAndFetch({
      userId: user.id,
      githubAccountId: ghAccount.id,
      name: ghAccount.name,
      slug: ghAccount.login,
    });
  });
};

async function registerAccountFromGithub(accessToken: string) {
  const octokit = getTokenOctokit(accessToken);
  const profile = await octokit.users.getAuthenticated();
  const ghAccount = await getOrCreateGhAccount(profile.data);
  const account = await getOrCreateAccount(ghAccount, accessToken);
  return account;
}

router.post(
  "/auth/github",
  bodyParser.json(),
  asyncHandler(async (req, res) => {
    const result = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: config.get("github.clientId"),
        client_secret: config.get("github.clientSecret"),
        code: req.body.code,
      },
      {
        headers: {
          accept: "application/json",
        },
      }
    );

    if (result.data.error) {
      res.status(400);
      res.send(result.data);
      return;
    }

    const account = await registerAccountFromGithub(result.data.access_token);
    res.send({
      jwt: createJWT({
        version: 1,
        account: {
          id: account.id,
          name: account.name,
          slug: account.slug,
        },
      }),
    });
  })
);
