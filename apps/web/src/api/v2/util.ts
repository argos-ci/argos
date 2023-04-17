import type { Request } from "express";
// @ts-ignore
import { HttpError } from "express-err";
import type { TransactionOrKnex } from "objection";

import { pushBuildNotification } from "@argos-ci/build-notification";
import { transaction } from "@argos-ci/database";
import {
  Account,
  Build,
  Repository,
  ScreenshotBucket,
} from "@argos-ci/database/models";

export const getBuildName = (name: string | undefined | null) =>
  name || "default";

type CreateRequest = Request<
  Record<string, never>,
  Record<string, never>,
  {
    commit: string;
    branch: string;
    name?: string | null;
    parallel?: string | null;
    parallelNonce?: string | null;
    prNumber?: number | null;
  }
> & { authRepository: Repository };

const getBucketData = (req: CreateRequest) => {
  return {
    name: getBuildName(req.body.name),
    commit: req.body.commit,
    branch: req.body.branch,
    repositoryId: req.authRepository.id,
  };
};

const getBuildData = (req: CreateRequest) => {
  const parallel = req.body.parallel;
  return {
    jobStatus: "pending" as const,
    baseScreenshotBucketId: null,
    externalId: parallel ? req.body.parallelNonce ?? null : null,
    batchCount: parallel ? 0 : null,
    repositoryId: req.authRepository.id,
    name: getBuildName(req.body.name),
    prNumber: req.body.prNumber ?? null,
  };
};

export const createBuild = async ({
  req,
  trx,
}: {
  req: CreateRequest;
  trx?: TransactionOrKnex;
}) => {
  if (req.authRepository.private || req.authRepository.forcedPrivate) {
    const account = await Account.getAccount(req.authRepository);
    const hasExceedLimit = await account.hasExceedScreenshotsMonthlyLimit();
    if (hasExceedLimit) {
      throw new HttpError(
        402,
        `Build rejected for insufficient credit. Please upgrade Argos plan.`
      );
    }
  }

  return transaction(trx, async (trx) => {
    const bucketData = {
      ...getBucketData(req),
      complete: false,
    };
    const bucket = await ScreenshotBucket.query(trx).insertAndFetch(bucketData);

    const buildData = {
      ...getBuildData(req),
      compareScreenshotBucketId: bucket.id,
    };
    const build = await Build.query(trx).insertAndFetch(buildData);

    await pushBuildNotification({
      buildId: build.id,
      type: "queued",
      trx,
    });

    return build;
  });
};
