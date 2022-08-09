import { Octokit } from "@octokit/rest";
import { createOAuthAppAuth } from "@octokit/auth-oauth-app";
import config from "@argos-ci/config";

export const githubClient = new Octokit({
  debug: config.get("env") === "development",
  authStrategy: createOAuthAppAuth,
  auth: {
    clientId: config.get("github.clientId"),
    clientSecret: config.get("github.clientSecret"),
  },
});
