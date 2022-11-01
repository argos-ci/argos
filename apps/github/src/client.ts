import { createAppAuth } from "@octokit/auth-app";
import { createOAuthAppAuth } from "@octokit/auth-oauth-app";
import { Octokit } from "@octokit/rest";

import config from "@argos-ci/config";

export const getAppOctokit = () => {
  return new Octokit({
    debug: config.get("env") === "development",
    authStrategy: createAppAuth,
    auth: {
      appId: config.get("github.appId"),
      privateKey: config.get("github.privateKey"),
    },
  });
};

export const getTokenOctokit = (token: string) => {
  return new Octokit({
    debug: config.get("env") === "development",
    auth: token,
  });
};

export const getOAuthOctokit = () => {
  return new Octokit({
    authStrategy: createOAuthAppAuth,
    auth: {
      clientId: config.get("github.clientId"),
      clientSecret: config.get("github.clientSecret"),
    },
  });
};

export const getInstallationOctokit = async (
  installationId: number,
  appOctokit = getAppOctokit()
): Promise<Octokit | null> => {
  const token = await (async () => {
    try {
      const result = await appOctokit.auth({
        type: "installation",
        installationId,
      });
      return (result as { token: string }).token;
    } catch (error) {
      if ((error as { status: number }).status === 404) {
        return null;
      }
      throw error;
    }
  })();
  if (!token) return null;
  return getTokenOctokit(token);
};
