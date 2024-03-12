import { invariant } from "@argos/util/invariant";

import { Build, Project } from "@/database/models/index.js";
import { getInstallationOctokit } from "@/github/index.js";
import { getGitlabClientFromAccount, GitlabClient } from "@/gitlab/index.js";
import { UnretryableError } from "@/job-core/index.js";

import {
  getBaseBucketForBuildAndCommit,
  queryBaseBucket,
} from "./baseQuery.js";

type Octokit = NonNullable<Awaited<ReturnType<typeof getInstallationOctokit>>>;

/**
 * Get the bucket from a list of commits, ordered by the order of the commits.
 */
async function getBucketFromCommits(args: { shas: string[]; build: Build }) {
  if (args.shas.length === 0) {
    return null;
  }
  return queryBaseBucket(args.build)
    .whereIn("commit", args.shas)
    .joinRaw(
      `join (values ${args.shas.map(
        (sha, index) => `('${sha}',${index})`,
      )}) as ordering(sha, rank) on commit = ordering.sha`,
    )
    .orderBy("ordering.rank")
    .first();
}

type MergeBaseStrategy<TCtx> = {
  detect: (project: Project) => boolean;
  getContext: (project: Project) => Promise<TCtx | null> | TCtx | null;
  getMergeBaseCommitSha: (args: {
    project: Project;
    ctx: TCtx;
    base: string;
    head: string;
  }) => Promise<string | null>;
  listParentCommitShas: (args: {
    project: Project;
    ctx: TCtx;
    sha: string;
  }) => Promise<string[]>;
};

const GithubStrategy: MergeBaseStrategy<{
  octokit: Octokit;
  owner: string;
  repo: string;
}> = {
  detect: (project: Project) => Boolean(project.githubRepository),
  getContext: async (project: Project) => {
    invariant(
      project.githubRepository?.githubAccount,
      "no github account found",
      UnretryableError,
    );

    const installation = project.githubRepository.activeInstallation;
    if (!installation) {
      return null;
    }
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
    } catch (error: any) {
      // If we can't find the base commit, then we can't give a bucket
      if (error.status === 404) {
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
    } catch (error: any) {
      if (error.status === 404) {
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

const GitlabStrategy: MergeBaseStrategy<{
  client: GitlabClient;
  gitlabProjectId: number;
}> = {
  detect: (project: Project) => Boolean(project.gitlabProject),
  getContext: async (project: Project) => {
    invariant(project.account, "no account found", UnretryableError);
    invariant(
      project.gitlabProject,
      "no gitlab project found",
      UnretryableError,
    );

    const client = await getGitlabClientFromAccount(project.account);

    if (!client) return null;

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

const strategies: MergeBaseStrategy<any>[] = [GithubStrategy, GitlabStrategy];

/**
 * Get the base bucket for a build.
 */
export async function getBaseScreenshotBucket(build: Build) {
  const richBuild = await build
    .$query()
    .withGraphFetched(
      "[project.[gitlabProject, githubRepository.[githubAccount, activeInstallation], account], compareScreenshotBucket]",
    );

  invariant(richBuild, "no build found", UnretryableError);

  const project = richBuild.project;

  invariant(project, "no project found", UnretryableError);

  const strategy = strategies.find((s) => s.detect(project));

  // If we don't have a strategy then we could only count on referenceCommit
  // specified by the user in the build.
  if (!strategy) {
    if (richBuild.referenceCommit) {
      return getBaseBucketForBuildAndCommit(build, richBuild.referenceCommit);
    }
    return null;
  }

  const referenceBranch =
    richBuild.referenceBranch ?? (await project.$getReferenceBranch());
  const base = referenceBranch;
  const head = build.compareScreenshotBucket!.commit;

  const ctx = await strategy.getContext(project);

  if (!ctx) {
    return null;
  }

  const mergeBaseCommitSha = await strategy.getMergeBaseCommitSha({
    project,
    ctx,
    base,
    head,
  });

  if (!mergeBaseCommitSha) {
    return null;
  }

  // If the merge base is the same as the head, then we have to found an ancestor
  // It happens when we are on the reference branch.
  if (mergeBaseCommitSha === head) {
    const shas = await strategy.listParentCommitShas({
      project,
      ctx,
      sha: mergeBaseCommitSha,
    });
    return getBucketFromCommits({ shas: shas.slice(1), build: richBuild });
  }

  const mergeBaseBucket = await getBaseBucketForBuildAndCommit(
    build,
    mergeBaseCommitSha,
  );

  // A bucket exists for the merge base commit
  if (mergeBaseBucket) {
    return mergeBaseBucket;
  }

  // If we don't have a bucket for the merge base commit, then we have to found an ancestor
  const shas = await strategy.listParentCommitShas({
    project,
    ctx,
    sha: mergeBaseCommitSha,
  });
  return getBucketFromCommits({ shas: shas.slice(1), build: richBuild });
}
