import type { TransactionOrKnex } from "objection";

import { ScreenshotBucket } from "@argos-ci/database/models";
import type { Build } from "@argos-ci/database/models";
import { getInstallationOctokit } from "@argos-ci/github";
import { UnretryableError } from "@argos-ci/job-core";

type Octokit = NonNullable<Awaited<ReturnType<typeof getInstallationOctokit>>>;

/**
 * Get the merge base commit sha between two refs.
 */
const getMergeBaseCommitSha = async (params: {
  octokit: Octokit;
  owner: string;
  repo: string;
  base: string;
  head: string;
}) => {
  try {
    const { data } = await params.octokit.rest.repos.compareCommitsWithBasehead(
      {
        owner: params.owner,
        repo: params.repo,
        basehead: `${params.base}...${params.head}`,
        per_page: 1,
      }
    );
    return data.merge_base_commit.sha;
  } catch (error: any) {
    // If we can't find the base commit, then we can't give a bucket
    if (error.status === 404) {
      return null;
    }

    throw error;
  }
};

/**
 * List all the parent commit shas of a given commit.
 */
const listParentCommitShas = async (params: {
  octokit: Octokit;
  sha: string;
  owner: string;
  repo: string;
}) => {
  try {
    const response = await params.octokit.repos.listCommits({
      owner: params.owner,
      repo: params.repo,
      sha: params.sha,
      per_page: 100,
    });
    return response.data.map((commit) => commit.sha).slice(1);
  } catch (error: any) {
    if (error.status === 404) {
      const notFoundError = new Error(
        `"${params.sha}" not found on repository "${params.repo}"`
      );
      // @ts-ignore
      notFoundError.retryable = false;
      throw notFoundError;
    }
    throw error;
  }
};

/**
 * Query the base bucket from a build.
 */
const queryBaseBucket = (build: Build, trx?: TransactionOrKnex | undefined) => {
  return ScreenshotBucket.query(trx).where({
    repositoryId: build.repository!.id,
    name: build.name,
    complete: true,
  });
};

/**
 * Get the bucket from a list of commits, ordered by the order of the commits.
 */
const getBucketFromCommits = async (params: {
  shas: string[];
  build: Build;
  trx?: TransactionOrKnex | undefined;
}) => {
  return queryBaseBucket(params.build, params.trx)
    .whereIn("commit", params.shas)
    .joinRaw(
      `join (values ${params.shas.map(
        (sha, index) => `('${sha}',${index})`
      )}) as ordering(sha, rank) on commit = ordering.sha`
    )
    .orderBy("ordering.rank")
    .first();
};

/**
 * Get the bucket from the closest ancestor of a commit.
 */
const getBucketFromAncestors = async (params: {
  octokit: Octokit;
  owner: string;
  repo: string;
  sha: string;
  build: Build;
  trx?: TransactionOrKnex | undefined;
}) => {
  const shas = await listParentCommitShas({
    octokit: params.octokit,
    sha: params.sha,
    owner: params.owner,
    repo: params.repo,
  });
  return getBucketFromCommits({ shas, build: params.build, trx: params.trx });
};

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
    .withGraphFetched("[repository.installations, compareScreenshotBucket]");

  const [installation] = richBuild.repository!.installations!;
  if (!installation) {
    // In test environment, we don't want to run any GitHub API call
    if (process.env["NODE_ENV"] === "test") {
      return null;
    }
    throw new UnretryableError(
      `Installation not found for repository "${richBuild.repository!.id}"`
    );
  }

  const octokit = await getInstallationOctokit(installation.id);
  if (!octokit) {
    throw new UnretryableError(
      `No valid installation found for repository "${richBuild.repository!.id}"`
    );
  }

  // Initialize GitHub API
  const owner = await richBuild.repository!.$relatedOwner({ trx });

  if (!owner) {
    throw new Error("Invariant: no owner found");
  }

  const base = build.repository!.referenceBranch;
  const head = build.compareScreenshotBucket!.commit;

  const mergeBaseCommitSha = await getMergeBaseCommitSha({
    octokit,
    owner: owner.login,
    repo: richBuild.repository!.name,
    base,
    head,
  });

  if (!mergeBaseCommitSha) {
    return null;
  }

  // If the merge base is the same as the head, then we have to found an ancestor
  // It happens when we are on the reference branch.
  if (mergeBaseCommitSha === head) {
    return getBucketFromAncestors({
      octokit,
      sha: mergeBaseCommitSha,
      owner: owner.login,
      repo: richBuild.repository!.name,
      build,
      trx,
    });
  }

  const mergeBaseBucket = await queryBaseBucket(build, trx)
    .where({ commit: mergeBaseCommitSha })
    .first();

  // A bucket exists for the merge base commit
  if (mergeBaseBucket) {
    return mergeBaseBucket;
  }

  // If we don't have a bucket for the merge base commit, then we have to found an ancestor
  return getBucketFromAncestors({
    octokit,
    sha: mergeBaseCommitSha,
    owner: owner.login,
    repo: richBuild.repository!.name,
    build,
    trx,
  });
};
