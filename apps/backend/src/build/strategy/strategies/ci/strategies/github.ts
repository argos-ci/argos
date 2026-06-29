import { invariant } from "@argos/util/invariant";
import pRetry from "p-retry";

import {
  GithubInstallation,
  GithubRepository,
  Project,
} from "@/database/models";
import { checkOctokitErrorStatus, getInstallationOctokit } from "@/github";
import { UnretryableError } from "@/job-core";
import { boom } from "@/util/error";

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

  // The "light" app has no read access to the repository, so it can't resolve
  // the commit ancestry from the GitHub API.
  hasCommitHistoryAccess: (ctx) => ctx.installation.app !== "light",

  getMergeBaseCommitSha: async (args) => {
    // The light app has no read access to the repository, so it can't resolve
    // the merge base. We rely on the base commit provided by the user in the CLI
    // and, as a fallback, on the latest bucket of the base branch (see
    // `hasCommitHistoryAccess` handling in the common logic).
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
          if (checkOctokitErrorStatus(404, error)) {
            return null;
          }

          throw error;
        }
      },
      { retries: 3 },
    );
  },
  listParentCommitShas: async (args) => {
    // The light app has no read access to the repository, so it can't list the
    // parent commits. The common logic falls back to the latest bucket of the
    // base branch (see `hasCommitHistoryAccess`), so we return [] here.
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
      // 409 = Git Repository is empty.
      if (checkOctokitErrorStatus(409, error)) {
        return [];
      }
      if (checkOctokitErrorStatus(404, error)) {
        throw boom(
          404,
          `"${args.sha}" not found on repository "${args.ctx.repo}"`,
          { retryable: false },
        );
      }
      throw error;
    }
  },
};
