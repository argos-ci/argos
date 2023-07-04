import axios from "axios";
import bodyParser from "body-parser";
import cors from "cors";
import { Router } from "express";

import config from "@argos-ci/config";
import {
  getOrCreateGhAccountFromGhProfile,
  getOrCreateUserAccountFromGhAccount,
} from "@argos-ci/database/services/account";
import { getTokenOctokit } from "@argos-ci/github";

import { createJWT } from "../jwt.js";
import { asyncHandler } from "../util.js";

const router = Router();

export default router;

// @TODO be more restrictive on cors
router.use(cors());

async function registerAccountFromGithub(accessToken: string) {
  const octokit = getTokenOctokit(accessToken);
  const [profile, emails] = await Promise.all([
    octokit.users.getAuthenticated(),
    octokit.users.listEmailsForAuthenticatedUser(),
  ]);
  const ghAccount = await getOrCreateGhAccountFromGhProfile(
    profile.data,
    emails.data
  );
  const account = await getOrCreateUserAccountFromGhAccount(
    ghAccount,
    accessToken
  );
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
