import { createAppAuth } from "@octokit/auth-app";
import type { OctokitOptions } from "@octokit/core";
import { retry } from "@octokit/plugin-retry";
import { Octokit } from "@octokit/rest";
import { fetch, ProxyAgent, type RequestInit, type Response } from "undici";

import config from "@/config/index.js";
import { GithubInstallation } from "@/database/models/index.js";

export type { RestEndpointMethodTypes } from "@octokit/rest";

Octokit.plugin(retry);

export type { Octokit };

const apps: Record<
  GithubInstallation["app"],
  {
    appId: string;
    privateKey: string;
  }
> = {
  main: {
    appId: config.get("github.appId"),
    privateKey: config.get("github.privateKey"),
  },
  light: {
    appId: config.get("githubLight.appId"),
    privateKey: config.get("githubLight.privateKey"),
  },
};

/**
 * Proxy fetch function to use with Octokit.
 * It has the same signature as the fetch function but it uses a proxy
 * to send requests through a static IP address.
 */
async function proxyFetch(url: string, init: RequestInit): Promise<Response> {
  const proxyUrl = config.get("github.proxyUrl");
  if (!proxyUrl) {
    throw new Error("Proxy URL is not set");
  }
  const response = await fetch(url, {
    ...init,
    dispatcher: new ProxyAgent(proxyUrl),
  });
  return response;
}

interface GetOctokitOptions extends Omit<OctokitOptions, "debug" | "request"> {
  /**
   * Use a proxy to send requests through a static IP address.
   */
  proxy: boolean;
}

/**
 * Get an Octokit instance.
 */
function getOctokit(options: GetOctokitOptions): Octokit {
  const { proxy, ...rest } = options;
  return new Octokit({
    debug: config.get("env") === "development",
    request: {
      fetch: proxy ? proxyFetch : undefined,
    },
    ...rest,
  });
}

interface GetAppOctokitOptions
  extends Pick<GetOctokitOptions, "proxy">,
    Pick<GithubInstallation, "app"> {}

/**
 * Get an Octokit instance for a GitHub App.
 * This is used to authenticate as a GitHub App.
 */
export function getAppOctokit(options: GetAppOctokitOptions): Octokit {
  const { app, ...rest } = options;
  return getOctokit({
    ...rest,
    authStrategy: createAppAuth,
    auth: {
      appId: apps[app].appId,
      privateKey: apps[app].privateKey,
    },
  });
}

interface GetTokenOctokitOptions extends Pick<GetOctokitOptions, "proxy"> {
  /**
   * The token to use for authentication.
   */
  token: string;
}

/**
 * Get an Octokit instance for a token.
 * This is used to authenticate as a user or an installation.
 */
export function getTokenOctokit(options: GetTokenOctokitOptions): Octokit {
  const { token, ...rest } = options;
  return getOctokit({
    ...rest,
    auth: token,
  });
}

/**
 * Get an Octokit instance for a GitHub App installation.
 * Automatically refreshes the token if it is expired.
 */
export async function getInstallationOctokit(
  installation: GithubInstallation,
  appOctokit?: Octokit,
): Promise<Octokit | null> {
  appOctokit =
    appOctokit ??
    getAppOctokit({ app: installation.app, proxy: installation.proxy });

  if (installation.githubToken && installation.githubTokenExpiresAt) {
    const expiredAt = Number(new Date(installation.githubTokenExpiresAt));
    const now = Date.now();
    const delay = 60 * 5 * 1000; // 5 minutes
    const expired = expiredAt < now + delay;
    if (!expired) {
      const token = installation.githubToken;
      return getTokenOctokit({ token, proxy: installation.proxy });
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
    await GithubInstallation.query().findById(installation.id).patch({
      deleted: true,
      githubToken: null,
      githubTokenExpiresAt: null,
    });
    return null;
  }
  await GithubInstallation.query().findById(installation.id).patch({
    deleted: false,
    githubToken: result.token,
    githubTokenExpiresAt: result.expiresAt,
  });
  return getTokenOctokit({ token: result.token, proxy: installation.proxy });
}

/**
 * Check the error status.
 */
export function checkErrorStatus(status: number, error: unknown): boolean {
  if (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status === status;
  }
  return false;
}
