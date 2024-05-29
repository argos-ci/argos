import { invariant } from "@argos/util/invariant";

import { Project } from "@/database/models/index.js";
import { getGitlabClientFromAccount, GitlabClient } from "@/gitlab/index.js";
import { UnretryableError } from "@/job-core/index.js";

import { MergeBaseStrategy } from "../types.js";

export const GitlabStrategy: MergeBaseStrategy<{
  client: GitlabClient;
  gitlabProjectId: number;
}> = {
  detect: (project: Project) => Boolean(project.gitlabProject),
  getContext: async (project: Project) => {
    await project.$fetchGraph("[account, gitlabProject]", {
      skipFetched: true,
    });

    invariant(project.account, "no account found", UnretryableError);
    invariant(
      project.gitlabProject,
      "no gitlab project found",
      UnretryableError,
    );

    const client = await getGitlabClientFromAccount(project.account);

    if (!client) {
      return null;
    }

    return { client, gitlabProjectId: project.gitlabProject.gitlabId };
  },
  getMergeBaseCommitSha: async (args) => {
    const result = await args.ctx.client.Repositories.mergeBase(
      args.ctx.gitlabProjectId,
      [args.base, args.head],
    );
    return result.id;
  },
  listParentCommitShas: async (args) => {
    const result = await args.ctx.client.Commits.all(args.ctx.gitlabProjectId, {
      refName: args.sha,
    });
    return result.map((commit) => commit.id);
  },
};
