import type { TransactionOrKnex } from "objection";

import { ScreenshotBucket } from "@/database/models/index.js";
import type { Build, Project } from "@/database/models/index.js";
import { getInstallationOctokit } from "@/github/index.js";
import { UnretryableError } from "@/job-core/index.js";
import { GitlabClient, getGitlabClientFromAccount } from "@/gitlab/index.js";

type Octokit = NonNullable<Awaited<ReturnType<typeof getInstallationOctokit>>>;

/**
 * Query the base bucket from a build.
 */
const queryBaseBucket = (build: Build, trx?: TransactionOrKnex | undefined) => {
  if (!build.project) {
    throw new UnretryableError("Invariant: no project found");
  }
  return ScreenshotBucket.query(trx).where({
    projectId: build.project.id,
    name: build.name,
    complete: true,
  });
};

/**
 * Get the bucket from a list of commits, ordered by the order of the commits.
 */
const getBucketFromCommits = async (args: {
  shas: string[];
  build: Build;
  trx?: TransactionOrKnex | undefined;
}) => {
  if (args.shas.length === 0) {
    return null;
  }
  return queryBaseBucket(args.build, args.trx)
    .whereIn("commit", args.shas)
    .joinRaw(
      `join (values ${args.shas.map(
        (sha, index) => `('${sha}',${index})`,
      )}) as ordering(sha, rank) on commit = ordering.sha`,
    )
    .orderBy("ordering.rank")
    .first();
};

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
    if (!project.githubRepository?.githubAccount) {
      throw new UnretryableError("Invariant: no github account found");
    }
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
    if (!project.account) {
      throw new UnretryableError("Invariant: no account found");
    }

    if (!project.gitlabProject) {
      throw new UnretryableError("Invariant: no gitlab project found");
    }

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
export const getBaseScreenshotBucket = async ({
  build,
  trx,
}: {
  build: Build;
  trx?: TransactionOrKnex | undefined;
}) => {
  const richBuild = await build
    .$query(trx)
    .withGraphFetched(
      "[project.[gitlabProject, githubRepository.[githubAccount, activeInstallation], account], compareScreenshotBucket]",
    );

  if (!richBuild) {
    throw new UnretryableError("Invariant: no build found");
  }

  const project = richBuild.project;

  if (!project) {
    throw new UnretryableError("Invariant: no project found");
  }

  const strategy = strategies.find((s) => s.detect(project));

  if (!strategy) {
    if (richBuild.referenceCommit) {
      const mergeBaseBucket = await queryBaseBucket(build, trx)
        .where({ commit: richBuild.referenceCommit })
        .first();
      return mergeBaseBucket ?? null;
    }
    return null;
  }

  const referenceBranch =
    richBuild.referenceBranch ?? (await project.$getReferenceBranch(trx));
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
    return getBucketFromCommits({ shas: shas.slice(1), build: richBuild, trx });
  }

  const mergeBaseBucket = await queryBaseBucket(build, trx).findOne({
    commit: mergeBaseCommitSha,
  });

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
  return getBucketFromCommits({ shas: shas.slice(1), build: richBuild, trx });
};
