import { createAppAuth } from "@octokit/auth-app";
import { retry } from "@octokit/plugin-retry";
import { Octokit } from "@octokit/rest";

import config from "@/config/index.js";
import { GithubInstallation } from "@/database/models/index.js";

export type { RestEndpointMethodTypes } from "@octokit/rest";

// @ts-expect-error problem with Octokit types
Octokit.plugin(retry);

export type { Octokit };

export const getAppOctokit = (): Octokit => {
  return new Octokit({
    debug: config.get("env") === "development",
    authStrategy: createAppAuth,
    auth: {
      appId: config.get("github.appId"),
      privateKey: config.get("github.privateKey"),
    },
  });
};

export const getTokenOctokit = (token: string): Octokit => {
  return new Octokit({
    debug: config.get("env") === "development",
    auth: token,
  });
};

export async function getInstallationOctokit(
  installationId: string,
  appOctokit: Octokit = getAppOctokit(),
): Promise<Octokit | null> {
  const installation = await GithubInstallation.query()
    .findById(installationId)
    .throwIfNotFound();
  if (installation.githubToken && installation.githubTokenExpiresAt) {
    const expiredAt = Number(new Date(installation.githubTokenExpiresAt));
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
        installationId: installation.githubId,
      })) as { token: string; expiresAt: string };
      return result;
    } catch (error) {
      const status = (error as { status: number }).status;
      // 404 means the installation has been deleted
      // 403 means the installation has been suspended
      if (status === 404 || status === 403) {
        return null;
      }
      throw error;
    }
  })();
  if (!result) {
    await GithubInstallation.query().findById(installationId).patch({
      deleted: true,
      githubToken: null,
      githubTokenExpiresAt: null,
    });
    return null;
  }
  await GithubInstallation.query().findById(installationId).patch({
    deleted: false,
    githubToken: result.token,
    githubTokenExpiresAt: result.expiresAt,
  });
  return getTokenOctokit(result.token);
}
