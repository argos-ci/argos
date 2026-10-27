import { invariant } from "@argos/util/invariant";

import { Project } from "@/database/models";
import { getGitlabClientForProject, type GitlabProjectClient } from "@/gitlab";
import { UnretryableError } from "@/job-core";

import { MergeBaseStrategy } from "../types";

export const GitlabStrategy: MergeBaseStrategy<GitlabProjectClient> = {
  detect: (project: Project) => Boolean(project.gitlabProjectId),
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

    return getGitlabClientForProject(project.account, project.gitlabProject, {
      mode: "headless",
    });
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
