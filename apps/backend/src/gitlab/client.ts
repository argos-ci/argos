import { Gitlab } from "@gitbeaker/rest";

import config from "@/config";
import type { Account, GitlabProject } from "@/database/models";
import logger from "@/logger";
import { sendNotification } from "@/notification";

export type { ExpandedUserSchema } from "@gitbeaker/rest";

export type GitlabClient = InstanceType<typeof Gitlab<false>>;

export const GITLAB_COM_URL = "https://gitlab.com";

export function getGitlabBaseUrl(account: Account): string {
  return account.gitlabBaseUrl ?? GITLAB_COM_URL;
}

export function getGitlabClient(params: {
  accessToken: string;
  baseUrl?: string | null;
}): GitlabClient {
  const client = new Gitlab({
    oauthToken: params.accessToken,
    host: params.baseUrl ?? GITLAB_COM_URL,
  });
  // If we are on-premise
  if (params.baseUrl) {
    // Specify a special header to authenticate with ngrok
    Object.keys(client).forEach((key) => {
      // @ts-expect-error This is a hack to add a header to all requests
      if (client[key] && client[key].headers) {
        // @ts-expect-error This is a hack to add a header to all requests
        client[key].headers["X-Argos-Auth"] = config.get(
          "gitlab.argosAuthSecret",
        );
      }
    });
  }
  return client;
}

export async function getGitlabClientFromAccount(
  account: Account,
  options: {
    /**
     * Controls whether the account owners are notified by email when the token
     * turns out to be invalid:
     * - `"headless"`: the client is used server-side with no user watching (e.g.
     *   build processing). The failure is invisible to the user, so we email the
     *   owners to ask them to reconnect GitLab.
     * - `"manual"`: the client serves an interactive request (e.g. selecting
     *   repositories in the UI). The failure is surfaced in the UI directly, so
     *   we don't send an email.
     */
    mode: "manual" | "headless";
  },
): Promise<GitlabClient | null> {
  if (!account.gitlabAccessToken) {
    return null;
  }
  const client = getGitlabClient({
    accessToken: account.gitlabAccessToken,
    baseUrl: account.gitlabBaseUrl,
  });
  try {
    const res = await client.PersonalAccessTokens.show();
    if (!res.scopes?.includes("api")) {
      await account.$clone().$query().patch({
        gitlabAccessToken: null,
      });
      return null;
    }
    return client;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "Unauthorized" ||
        error.message === "Not Found" ||
        error.message === "invalid_token")
    ) {
      // Only notify the owners when the failure happens headlessly. In manual
      // mode the caller surfaces the error to the user directly, so an email
      // would be redundant noise.
      if (options.mode === "headless") {
        const ownerIds = await account.$getOwnerIds();
        await sendNotification({
          type: "invalid_gitlab_token",
          data: {
            account: {
              name: account.name || account.slug,
              settingsURL: new URL(
                `/${account.slug}/settings/integrations#gitlab`,
                config.get("server.url"),
              ).toString(),
            },
          },
          recipients: ownerIds,
        });
      }
      return null;
    }
    throw error;
  }
}

export type GitlabProjectClient = {
  client: GitlabClient;
  gitlabProjectId: number;
};

/**
 * Same as {@link getGitlabClientFromAccount}, bound to a linked GitLab project.
 * A project linked while the account pointed at another instance is out of
 * reach: on the current one, its `gitlabId` names some other project, if any.
 */
export async function getGitlabClientForProject(
  account: Account,
  gitlabProject: GitlabProject,
  options: Parameters<typeof getGitlabClientFromAccount>[1],
): Promise<GitlabProjectClient | null> {
  const accountBaseUrl = getGitlabBaseUrl(account);
  if (gitlabProject.baseUrl !== accountBaseUrl) {
    logger.warn(
      {
        accountId: account.id,
        gitlabProjectId: gitlabProject.id,
        projectBaseUrl: gitlabProject.baseUrl,
        accountBaseUrl,
      },
      "GitLab project belongs to another instance than its account's",
    );
    return null;
  }
  const client = await getGitlabClientFromAccount(account, options);
  return client ? { client, gitlabProjectId: gitlabProject.gitlabId } : null;
}
