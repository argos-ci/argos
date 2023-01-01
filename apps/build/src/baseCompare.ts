import type { TransactionOrKnex } from "objection";

import { ScreenshotBucket } from "@argos-ci/database/models";
import type { Build } from "@argos-ci/database/models";
import { getInstallationOctokit } from "@argos-ci/github";

interface Commit {
  sha: string;
}

const getLatestBaselineBucket = async (
  build: Build,
  { trx }: { trx?: TransactionOrKnex | undefined } = {}
) => {
  const bucket = await ScreenshotBucket.query(trx)
    .where({
      branch: build.repository!.referenceBranch,
      repositoryId: build.repository!.id,
      name: build.name,
      complete: true,
    })
    .whereNot({
      id: build.compareScreenshotBucket!.id,
    })
    .orderBy("id", "desc")
    .first();

  return bucket ?? null;
};

const getBaseScreenshotBucket = async ({
  commits,
  build,
  trx,
}: {
  commits: Commit[];
  build: Build;
  trx?: TransactionOrKnex | undefined;
}) => {
  // We hope we will have a build of Argos from the latest 5 commits
  // no need to ask for more, we will run out of memory
  const shas = commits.map((commit) => commit.sha).slice(0, 5);
  const buckets = await ScreenshotBucket.query(trx)
    .where({
      repositoryId: build.repository!.id,
      branch: build.repository!.referenceBranch,
      name: build.name,
      complete: true,
    })
    .whereIn("commit", shas);

  // Sort buckets from the most recent commit to the oldest one
  buckets.sort(
    (bucketA, bucketB) =>
      shas.indexOf(bucketA.commit) - shas.indexOf(bucketB.commit)
  );

  return buckets[0] || getLatestBaselineBucket(build, { trx });
};

const getPotentialCommits = ({
  baseCommits,
  compareCommits,
}: {
  baseCommits: Commit[];
  compareCommits: Commit[];
}) => {
  // We remove the first commit of compare commit history
  // because it is the commit we are comparing to
  // and we don't want to include it in the potential commits
  const validCompareCommits = compareCommits.slice(1);

  // We take all commits included in base commit history and in compare commit history
  const potentialCommits = baseCommits.filter((baseCommit) =>
    validCompareCommits.some(
      (compareCommit) => baseCommit.sha === compareCommit.sha
    )
  );

  // If no commit is found, we will use all base commits
  // TODO: this case should not happen, we should always find a base commit to our branch
  if (!potentialCommits.length) {
    return baseCommits;
  }

  return potentialCommits;
};

export const baseCompare = async ({
  baseCommit,
  compareCommit,
  build,
  trx,
}: {
  baseCommit: string;
  compareCommit: string;
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
    const error = new Error(
      `Installation not found for repository "${richBuild.repository!.id}"`
    );
    // @ts-ignore
    error.retryable = false;
    throw error;
  }

  const octokit = await getInstallationOctokit(installation.id);
  if (!octokit) {
    const error = new Error(
      `No valid installation found for repository "${richBuild.repository!.id}"`
    );
    // @ts-ignore
    error.retryable = false;
    throw error;
  }

  // Initialize GitHub API
  const owner = await richBuild.repository!.$relatedOwner({ trx });

  if (!owner) {
    throw new Error("Invariant: no owner found");
  }

  const getCommits = async (sha: string) => {
    try {
      const response = await octokit.repos.listCommits({
        owner: owner.login,
        repo: richBuild.repository!.name,
        sha,
        per_page: 100,
      });
      return response.data;
    } catch (error: any) {
      if (error.status === 404) {
        const notFoundError = new Error(
          `"${sha}" not found on repository "${richBuild.repository!.id}"`
        );
        // @ts-ignore
        notFoundError.retryable = false;
        throw notFoundError;
      }
      throw error;
    }
  };

  const [baseCommits, compareCommits] = await Promise.all([
    getCommits(baseCommit),
    getCommits(compareCommit),
  ]);

  const potentialCommits = getPotentialCommits({
    baseCommits,
    compareCommits,
  });

  return getBaseScreenshotBucket({
    commits: potentialCommits,
    build: richBuild,
    trx,
  });
};
