import { Gitlab, ExpandedUserSchema } from "@gitbeaker/rest";

export type { ExpandedUserSchema };

export const getTokenGitlabClient = (oauthToken: string) => {
  return new Gitlab({ oauthToken });
};
