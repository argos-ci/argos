import { Octokit } from "@octokit/rest";
import type { TransactionOrKnex } from "objection";

import config from "@argos-ci/config";
import {
  ScreenshotBucket,
  UserRepositoryRight,
} from "@argos-ci/database/models";
import type { Build, Repository, User } from "@argos-ci/database/models";

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

async function getCommits({
  user,
  repository,
  octokit,
  owner,
  sha,
  perPage,
  trx,
}: {
  user: User;
  repository: Repository;
  octokit: Octokit;
  owner: string;
  sha: string;
  perPage: number;
  trx?: TransactionOrKnex | undefined;
}) {
  const params = {
    owner,
    repo: repository.name,
    sha,
    per_page: perPage,
    page: 1,
  };

  try {
    const response = await octokit.repos.listCommits(params);
    return response.data;
  } catch (error: any) {
    // Several things here:
    // - Token is no longer valid
    // - The user lost access to the repository
    // - The repository has been removed
    if (error.status === 401 || error.status === 404) {
      // We remove the rights for the user
      await UserRepositoryRight.query(trx)
        .where({ userId: user.id, repositoryId: repository.id })
        .delete();
      // The error should not be notified on Sentry
      return [];
    }
    throw error;
  }
}

const getPotentialCommits = ({
  baseCommits,
  compareCommits,
}: {
  baseCommits: Commit[];
  compareCommits: Commit[];
}) => {
  // We take all commits included in base commit history and in compare commit history
  const potentialCommits = baseCommits.filter((baseCommit) =>
    compareCommits.some((compareCommit) => baseCommit.sha === compareCommit.sha)
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
  perPage = 100,
  trx,
}: {
  baseCommit: string;
  compareCommit: string;
  build: Build;
  perPage?: number;
  trx?: TransactionOrKnex | undefined;
}) => {
  const richBuild = await build
    .$query(trx)
    .withGraphFetched("[repository, compareScreenshotBucket]");
  const user = await richBuild.repository!.getUsers({ trx }).first();

  // We can't use Github information without a user.
  if (!user) {
    return getLatestBaselineBucket(richBuild, { trx });
  }

  // Initialize GitHub API
  const owner = await richBuild.repository!.$relatedOwner({ trx });
  const octokit = new Octokit({
    debug: config.get("env") === "development",
    auth: user.accessToken,
  });

  if (!owner) {
    throw new Error("Invariant: no owner found");
  }

  const baseCommits = await getCommits({
    user,
    repository: richBuild.repository!,
    octokit,
    owner: owner.login,
    sha: baseCommit,
    perPage,
    trx,
  });

  const compareCommits = await getCommits({
    user,
    repository: richBuild.repository!,
    octokit,
    owner: owner.login,
    sha: compareCommit,
    perPage,
    trx,
  });

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
