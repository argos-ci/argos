import type { Request } from "express";
// @ts-ignore
import { HttpError } from "express-err";
import type { PartialModelObject, TransactionOrKnex } from "objection";

import { pushBuildNotification } from "@argos-ci/build-notification";
import { transaction } from "@argos-ci/database";
import { Build, Project, ScreenshotBucket } from "@argos-ci/database/models";

export const getBuildName = (name: string | undefined | null) =>
  name || "default";

type CreateRequest = Request<
  Record<string, never>,
  Record<string, never>,
  {
    commit: string;
    branch: string;
    referenceCommit?: string | null;
    referenceBranch?: string | null;
    name?: string | null;
    parallel?: string | null;
    parallelNonce?: string | null;
    prNumber?: number | null;
  }
> & { authProject: Project };

const getBucketData = (
  req: CreateRequest
): PartialModelObject<ScreenshotBucket> => {
  return {
    name: getBuildName(req.body.name),
    commit: req.body.commit,
    branch: req.body.branch,
    projectId: req.authProject.id,
  };
};

const getBuildData = (req: CreateRequest): PartialModelObject<Build> => {
  const parallel = req.body.parallel;
  return {
    jobStatus: "pending" as const,
    baseScreenshotBucketId: null,
    externalId: parallel ? req.body.parallelNonce ?? null : null,
    batchCount: parallel ? 0 : null,
    projectId: req.authProject.id,
    name: getBuildName(req.body.name),
    prNumber: req.body.prNumber ?? null,
    referenceCommit: req.body.referenceCommit ?? null,
    referenceBranch: req.body.referenceBranch ?? null,
  };
};

export const createBuild = async ({
  req,
  trx,
}: {
  req: CreateRequest;
  trx?: TransactionOrKnex;
}) => {
  const isPublic = await req.authProject.$checkIsPublic(trx);
  const account = await req.authProject.$relatedQuery("account", trx);

  if (!account) {
    throw new HttpError(404, `Account not found.`);
  }

  const plan = await account.$getPlan();
  if (account.type === "team" && (!plan || plan.name === "free")) {
    throw new HttpError(
      402,
      `Build rejected: upgrade to Pro to use team features.`
    );
  }

  if (!isPublic) {
    const hasExceedLimit = await account.$hasExceedScreenshotsMonthlyLimit();
    const hasUsageBasedPlan = await account.$hasUsageBasedPlan();
    if (hasExceedLimit && !hasUsageBasedPlan) {
      throw new HttpError(
        402,
        `Build rejected for insufficient credit. Please upgrade your Plan.`
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
