import { assertNever } from "@argos/util/assertNever";
import { createAppAuth } from "@octokit/auth-app";
import type { OctokitOptions } from "@octokit/core";
import { retry } from "@octokit/plugin-retry";
import { RequestError } from "@octokit/request-error";
import { Octokit } from "@octokit/rest";
import { memoize } from "lodash-es";
import { fetch, ProxyAgent, type RequestInit, type Response } from "undici";
import z from "zod";

import config from "@/config";
import { GithubInstallation } from "@/database/models";
import { boom } from "@/util/error";

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
 * Get the proxy agent from what is in the configuration.
 */
const getProxyAgent = memoize(() => {
  const proxyUrl = config.get("github.proxyUrl");
  if (!proxyUrl) {
    throw new Error("Proxy URL is not set");
  }
  return new ProxyAgent(proxyUrl);
});

/**
 * Proxy fetch function to use with Octokit.
 * It has the same signature as the fetch function but it uses a proxy
 * to send requests through a static IP address.
 */
async function proxyFetch(url: string, init: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    dispatcher: getProxyAgent(),
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
  extends Pick<GetOctokitOptions, "proxy">, Pick<GithubInstallation, "app"> {}

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
  if (installation.githubToken && installation.githubTokenExpiresAt) {
    const expiredAt = new Date(installation.githubTokenExpiresAt).getTime();
    const now = Date.now();
    const delay = 60 * 5 * 1000; // 5 minutes
    const isExpired = expiredAt < now + delay;
    if (!isExpired) {
      const octokit = getTokenOctokit({
        token: installation.githubToken,
        proxy: installation.proxy,
      });
      const isValid = await checkTokenValidity(octokit);
      if (isValid) {
        return octokit;
      }
    }
  }

  const result = await authInstallation({
    octokit:
      appOctokit ??
      getAppOctokit({ app: installation.app, proxy: installation.proxy }),
    installationId: installation.githubId,
  });
  switch (result.status) {
    case "deleted": {
      await GithubInstallation.query().findById(installation.id).patch({
        deleted: true,
        githubToken: null,
        githubTokenExpiresAt: null,
      });
      return null;
    }
    case "authenticated": {
      await GithubInstallation.query().findById(installation.id).patch({
        deleted: false,
        githubToken: result.token,
        githubTokenExpiresAt: result.expiresAt,
      });
      return getTokenOctokit({
        token: result.token,
        proxy: installation.proxy,
      });
    }
    default:
      assertNever(result);
  }
}

/**
 * Check if a token is still valid.
 */
async function checkTokenValidity(octokit: Octokit): Promise<boolean> {
  try {
    // cheap and doesn’t depend on repo permissions
    await octokit.rest.rateLimit.get();
    return true;
  } catch (error) {
    if (checkOctokitErrorStatus(401, error)) {
      return false;
    }
    throw error;
  }
}

const AuthInstallationResultSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
});

/**
 * Authenticate an installation.
 */
async function authInstallation(args: {
  octokit: Octokit;
  installationId: number;
}): Promise<
  | { status: "deleted" }
  | { status: "authenticated"; token: string; expiresAt: string }
> {
  const { octokit, installationId } = args;
  try {
    const result = await octokit.auth({
      type: "installation",
      installationId,
    });
    const parsed = AuthInstallationResultSchema.parse(result);
    return { status: "authenticated", ...parsed };
  } catch (error) {
    if (checkOctokitErrorStatus(404, error)) {
      return { status: "deleted" };
    }
    if (checkOctokitErrorStatus(403, error)) {
      // If error is a 403 and the error message is not about a suspended
      // installation, we want to know what is it.
      if (error.message.includes("This installation has been suspended")) {
        throw boom(
          403,
          "Installation suspended. Please unsuspend it in GitHub settings.",
          {
            cause: error,
            code: "GITHUB_INSTALLATION_SUSPENDED",
            retryable: false,
          },
        );
      }
    }
    throw error;
  }
}

/**
 * Get the status code from an Octokit RequestError.
 */
function getOctokitErrorStatus(error: unknown) {
  if (error instanceof RequestError) {
    return error.status;
  }
  return null;
}

/**
 * Check the status code from an Octokit RequestError.
 */
export function checkOctokitErrorStatus(
  status: number,
  error: unknown,
): error is RequestError {
  return getOctokitErrorStatus(error) === status;
}
