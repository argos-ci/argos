import axios from "axios";
import bodyParser from "body-parser";
import cors from "cors";
import { Router } from "express";

import config from "@argos-ci/config";
import { User } from "@argos-ci/database/models";
import { getTokenOctokit } from "@argos-ci/github";
import { synchronizeFromUserId } from "@argos-ci/synchronize";

import { createJWT } from "../jwt.js";
import { asyncHandler } from "../util.js";

const router = Router();

export default router;

// @TODO be more restrictive on cors
router.use(cors());

const getDataFromProfile = (profile: {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
}) => {
  return {
    githubId: profile.id,
    login: profile.login,
    name: profile.name,
    email: profile.email,
  };
};

async function registerUserFromGitHub(accessToken: string) {
  const octokit = getTokenOctokit(accessToken);

  const profile = await octokit.users.getAuthenticated();
  const userData = { ...getDataFromProfile(profile.data), accessToken };

  let user = await User.query().findOne({ githubId: userData.githubId });

  if (user) {
    await User.query().findById(user.id).patch(userData);
  } else {
    user = await User.query().insertAndFetch(userData);
  }

  await synchronizeFromUserId(user.id);

  return user;
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

    const user = await registerUserFromGitHub(result.data.access_token);
    res.send({
      jwt: createJWT(user),
    });
  })
);
