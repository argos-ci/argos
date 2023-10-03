import { Gitlab } from "@gitbeaker/rest";
import type { Account } from "@/database/models/index.js";

export type {
  ExpandedUserSchema,
  CommitablePipelineStatus,
} from "@gitbeaker/rest";

export const getTokenGitlabClient = (oauthToken: string) => {
  return new Gitlab({ oauthToken });
};

export type GitlabClient = ReturnType<typeof getTokenGitlabClient>;

export const getGitlabClientFromAccount = async (
  account: Account,
): Promise<GitlabClient | null> => {
  if (!account.gitlabAccessToken) {
    return null;
  }
  const client = new Gitlab({ token: account.gitlabAccessToken });
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
    if (error instanceof Error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        // @TODO notify user that its token has expired
        await account.$clone().$query().patch({
          gitlabAccessToken: null,
        });
        return null;
      }
    }
    throw error;
  }
};
