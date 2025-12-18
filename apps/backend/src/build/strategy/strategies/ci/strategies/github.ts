import { invariant } from "@argos/util/invariant";
import pRetry from "p-retry";

import {
  GithubInstallation,
  GithubRepository,
  Project,
} from "@/database/models";
import { checkErrorStatus, getInstallationOctokit } from "@/github";
import { UnretryableError } from "@/job-core";

import { MergeBaseStrategy } from "../types";

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

    const octokit = await getInstallationOctokit(installation);
    if (!octokit) {
      return null;
    }
    const owner = project.githubRepository.githubAccount.login;
    const repo = project.githubRepository.name;

    return { octokit, owner, repo, installation };
  },

  getMergeBaseCommitSha: async (args) => {
    // If the app is light, then we rely on the base commit provided by the user in CLI.
    // It is already handled in the common logic, so at this point we return null.
    // Note it may indicates a bad setup.
    if (args.ctx.installation.app === "light") {
      return null;
    }

    return pRetry(
      async () => {
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
      { retries: 3 },
    );
  },
  listParentCommitShas: async (args) => {
    // If the app is light, we just find the last bucket ancest on the base branch.
    // We can't know for sure that it's a parent, but it's the best we can do.
    // It can result into diffs that includes changes more recent than the current branch.
    // It is already handled in the common logic, so at this point we return [].
    // Note it may indicates a bad setup.
    if (args.ctx.installation.app === "light") {
      return [];
    }

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
        ) as Error & { retryable: boolean };
        notFoundError.retryable = false;
        throw notFoundError;
      }
      throw error;
    }
  },
};
