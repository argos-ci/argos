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
  async *listCommitPages(args) {
    const perPage = 100;
    for (let page = 1; ; page++) {
      // An explicit `page` makes gitbeaker fetch that page alone, instead of
      // following every `next` link through the whole history.
      const commits = await args.ctx.client.Commits.all(
        args.ctx.gitlabProjectId,
        { refName: args.sha, perPage, page },
      );
      yield commits.map((commit) => commit.id);
      if (commits.length < perPage) {
        return;
      }
    }
  },
};
