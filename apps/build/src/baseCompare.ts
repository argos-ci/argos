import type { TransactionOrKnex } from "objection";

import { ScreenshotBucket } from "@argos-ci/database/models";
import type { Build } from "@argos-ci/database/models";
import { getInstallationOctokit } from "@argos-ci/github";
import { UnretryableError } from "@argos-ci/job-core";

type Octokit = NonNullable<Awaited<ReturnType<typeof getInstallationOctokit>>>;

const getMergeBaseCommitSha = async (props: {
  octokit: Octokit;
  owner: string;
  repo: string;
  base: string;
  head: string;
}) => {
  try {
    const { data } = await props.octokit.rest.repos.compareCommitsWithBasehead({
      owner: props.owner,
      repo: props.repo,
      basehead: `${props.base}...${props.head}`,
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
};

export const baseCompare = async ({
  base,
  head,
  build,
  trx,
}: {
  base: string;
  head: string;
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

  const mergeBaseBucket = await ScreenshotBucket.query(trx).findOne({
    repositoryId: build.repository!.id,
    name: build.name,
    complete: true,
    commit: mergeBaseCommitSha,
  });

  return mergeBaseBucket ?? null;
};
