import type { Request } from "express";
// @ts-ignore
import { HttpError } from "express-err";

import { pushBuildNotification } from "@argos-ci/build-notification";
import { job as crawlJob } from "@argos-ci/crawl";
import { transaction } from "@argos-ci/database";
import {
  Build,
  Crawl,
  Project,
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
    referenceCommit?: string | null;
    referenceBranch?: string | null;
    name?: string | null;
    parallel?: string | null;
    parallelNonce?: string | null;
    prNumber?: number | null;
  }
> & { authProject: Project };

export const createBuild = async (params: {
  project: Project;
  commit: string;
  branch: string;
  buildName?: string | null;
  parallel?: { nonce: string } | null;
  prNumber?: number | null;
  referenceCommit?: string | null;
  referenceBranch?: string | null;
}) => {
  const [isPublic, account] = await Promise.all([
    params.project.$checkIsPublic(),
    params.project.$relatedQuery("account"),
  ]);

  if (!account) {
    throw new HttpError(404, `Account not found.`);
  }

  const plan = await account.$getPlan();
  if (account.type === "team" && (!plan || plan.name === "free")) {
    throw new HttpError(
      402,
      `Build rejected: upgrade to Pro to use Team features.`
    );
  }

  if (!isPublic) {
    const [hasExceededLimit, hasUsageBasedPlan] = await Promise.all([
      account.$hasExceedScreenshotsMonthlyLimit(),
      account.$hasUsageBasedPlan(),
    ]);
    if (hasExceededLimit && !hasUsageBasedPlan) {
      throw new HttpError(
        402,
        `Build rejected for insufficient credit. Please upgrade your Plan.`
      );
    }
  }

  const buildName = params.buildName || "default";

  return transaction(async (trx) => {
    const bucket = await ScreenshotBucket.query(trx).insertAndFetch({
      name: buildName,
      commit: params.commit,
      branch: params.branch,
      projectId: params.project.id,
      complete: false,
    });

    const build = await Build.query(trx).insertAndFetch({
      jobStatus: "pending" as const,
      baseScreenshotBucketId: null,
      externalId: params.parallel ? params.parallel.nonce : null,
      batchCount: params.parallel ? 0 : null,
      projectId: params.project.id,
      name: buildName,
      prNumber: params.prNumber ?? null,
      referenceCommit: params.referenceCommit ?? null,
      referenceBranch: params.referenceBranch ?? null,
      compareScreenshotBucketId: bucket.id,
    });

    await pushBuildNotification({
      buildId: build.id,
      type: "queued",
      trx,
    });

    return build;
  });
};

export const createCrawl = async (params: {
  build: Build;
  baseUrl: string;
}) => {
  const crawl = await Crawl.query().insertAndFetch({
    buildId: params.build.id,
    jobStatus: "pending",
    baseUrl: params.baseUrl,
  });

  await crawlJob.push(crawl.id);

  return crawl;
};

export const createBuildFromRequest = async ({
  req,
}: {
  req: CreateRequest;
}) => {
  return createBuild({
    project: req.authProject,
    buildName: req.body.name ?? null,
    commit: req.body.commit,
    branch: req.body.branch,
    parallel:
      req.body.parallel && req.body.parallelNonce
        ? { nonce: req.body.parallelNonce }
        : null,
    prNumber: req.body.prNumber ?? null,
    referenceCommit: req.body.referenceCommit ?? null,
    referenceBranch: req.body.referenceBranch ?? null,
  });
};
