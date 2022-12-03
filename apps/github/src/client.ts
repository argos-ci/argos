import { createAppAuth } from "@octokit/auth-app";
import { createOAuthAppAuth } from "@octokit/auth-oauth-app";
import { Octokit } from "@octokit/rest";

import config from "@argos-ci/config";
import { Installation } from "@argos-ci/database/models";

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
  const installation = await Installation.query().findById(installationId);
  if (!installation) {
    throw new Error(`Installation not found for id "${installationId}"`);
  }
  if (installation.githubToken && installation.githubTokenExpiredAt) {
    const expiredAt = Number(new Date(installation.githubTokenExpiredAt));
    const now = Date.now();
    const delay = 60 * 5 * 1000; // 5 minutes
    const expired = expiredAt < now + delay;
    if (!expired) {
      const token = installation.githubToken;
      return getTokenOctokit(token);
    }
  }
  const result = await (async () => {
    try {
      const result = (await appOctokit.auth({
        type: "installation",
        installationId,
      })) as { token: string; expiresAt: string };
      return result;
    } catch (error) {
      if ((error as { status: number }).status === 404) {
        return null;
      }
      throw error;
    }
  })();
  if (!result) {
    await Installation.query().findById(installationId).patch({
      deleted: true,
      githubToken: null,
      githubTokenExpiredAt: null,
    });
    return null;
  }
  await Installation.query().findById(installationId).patch({
    deleted: false,
    githubToken: result.token,
    githubTokenExpiredAt: result.expiresAt,
  });
  return getTokenOctokit(result.token);
};
