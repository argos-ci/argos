import { invariant } from "@argos/util/invariant";

import {
  GithubInstallation,
  GithubRepository,
  Project,
} from "@/database/models/index.js";
import { checkErrorStatus, getInstallationOctokit } from "@/github/index.js";
import { UnretryableError } from "@/job-core/index.js";

import { MergeBaseStrategy } from "../types.js";

type Octokit = NonNullable<Awaited<ReturnType<typeof getInstallationOctokit>>>;

export const GithubStrategy: MergeBaseStrategy<{
  octokit: Octokit;
  owner: string;
  repo: string;
  installation: GithubInstallation;
}> = {
  detect: (project: Project) => Boolean(project.githubRepositoryId),
  getContext: async (project: Project) => {
    await project.$fetchGraph(
      "githubRepository.[githubAccount, repoInstallations.installation]",
      { skipFetched: true },
    );

    invariant(
      project.githubRepository?.githubAccount,
      "no github account found",
      UnretryableError,
    );

    const installation = GithubRepository.pickBestInstallation(
      project.githubRepository,
    );

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

    return { octokit, owner, repo, installation };
  },

  getMergeBaseCommitSha: async (args) => {
    // If the app is light, then we rely on the reference commit provided by the user in CLI.
    if (args.ctx.installation.app === "light") {
      return args.build.referenceCommit;
    }

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
      if (checkErrorStatus(404, error)) {
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
      if (checkErrorStatus(404, error)) {
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
