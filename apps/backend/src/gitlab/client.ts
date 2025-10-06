import { Gitlab } from "@gitbeaker/rest";

import config from "@/config";
import type { Account } from "@/database/models/index.js";
import { sendNotification } from "@/notification";

export type { ExpandedUserSchema } from "@gitbeaker/rest";

export type GitlabClient = InstanceType<typeof Gitlab<false>>;

export function getGitlabClient(params: {
  accessToken: string;
  baseUrl?: string | null;
}): GitlabClient {
  const client = new Gitlab({
    oauthToken: params.accessToken,
    host: params.baseUrl ?? "https://gitlab.com",
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
      return null;
    }
    throw error;
  }
}
