import { Gitlab } from "@gitbeaker/rest";

export type {
  ExpandedUserSchema,
  CommitablePipelineStatus,
} from "@gitbeaker/rest";

export const getTokenGitlabClient = (oauthToken: string) => {
  return new Gitlab({ oauthToken });
};
