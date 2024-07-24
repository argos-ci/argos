import { invariant } from "@argos/util/invariant";

import { Project } from "@/database/models/index.js";
import { getInstallationOctokit, OctokitRequestError } from "@/github/index.js";
import { UnretryableError } from "@/job-core/index.js";

import { MergeBaseStrategy } from "../types.js";

type Octokit = NonNullable<Awaited<ReturnType<typeof getInstallationOctokit>>>;

export const GithubStrategy: MergeBaseStrategy<{
  octokit: Octokit;
  owner: string;
  repo: string;
}> = {
  detect: (project: Project) => Boolean(project.githubRepositoryId),
  getContext: async (project: Project) => {
    await project.$fetchGraph(
      "githubRepository.[githubAccount, activeInstallation]",
      { skipFetched: true },
    );

    invariant(
      project.githubRepository?.githubAccount,
      "no github account found",
      UnretryableError,
    );

    const installation = project.githubRepository.activeInstallation;
    invariant(
      installation,
      "no installation found, repository should be unlinked from project at this point",
      UnretryableError,
    );

    const octokit = await getInstallationOctokit(installation.id);
    if (!octokit) {
      return null;
    }
    const owner = project.githubRepository.githubAccount.login;
    const repo = project.githubRepository.name;

    return { octokit, owner, repo };
  },
  getMergeBaseCommitSha: async (args) => {
    try {
      const { data } =
        await args.ctx.octokit.rest.repos.compareCommitsWithBasehead({
          owner: args.ctx.owner,
          repo: args.ctx.repo,
          basehead: `${args.base}...${args.head}`,
          per_page: 1,
        });
      return data.merge_base_commit.sha;
    } catch (error) {
      // If we can't find the base commit, then we can't give a bucket
      if (error instanceof OctokitRequestError && error.status === 404) {
        return null;
      }

      throw error;
    }
  },
  listParentCommitShas: async (args) => {
    try {
      const response = await args.ctx.octokit.repos.listCommits({
        owner: args.ctx.owner,
        repo: args.ctx.repo,
        sha: args.sha,
        per_page: 100,
      });
      return response.data.map((commit) => commit.sha);
    } catch (error) {
      if (error instanceof OctokitRequestError && error.status === 404) {
        const notFoundError = new Error(
          `"${args.sha}" not found on repository "${args.ctx.repo}"`,
        );
        // @ts-ignore
        notFoundError.retryable = false;
        throw notFoundError;
      }
      throw error;
    }
  },
};
