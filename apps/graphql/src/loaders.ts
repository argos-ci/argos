import DataLoader from "dataloader";
import type { ModelClass } from "objection";

import {
  Build,
  File,
  Model,
  Organization,
  Repository,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  Test,
  User,
} from "@argos-ci/database/models";

const createModelLoader = <TModelClass extends ModelClass<Model>>(
  Model: TModelClass
) => {
  return new DataLoader<string, InstanceType<TModelClass>>(async (ids) => {
    const models = await Model.query().findByIds(ids as string[]);
    return ids.map((id) =>
      models.find((model: Model) => model.id === id)
    ) as InstanceType<TModelClass>[];
  });
};

type AggregatedStatus =
  | "accepted"
  | "rejected"
  | "diffDetected"
  | "stable"
  | "expired"
  | "pending"
  | "progress"
  | "complete"
  | "error"
  | "aborted";

const createBuildAggregatedStatusLoader = () =>
  new DataLoader<Build, AggregatedStatus>(async (builds) => {
    const statuses = await Build.getStatuses(builds as Build[]);
    const conclusions = await Build.getConclusions(
      builds.map((b) => b.id),
      statuses
    );
    const reviewStatuses = await Build.getReviewStatuses(
      builds.map((b) => b.id),
      conclusions
    );

    return builds.map((_build, index) => {
      if (reviewStatuses[index]) return reviewStatuses[index];
      if (conclusions[index]) return conclusions[index];
      return statuses[index];
    }) as AggregatedStatus[];
  });

const createLastScreenshotDiffLoader = () =>
  new DataLoader<string, ScreenshotDiff | null>(async (testIds) => {
    const lastScreenshotDiffs = await ScreenshotDiff.query()
      .select("*")
      .whereIn("testId", testIds as string[])
      .distinctOn("testId")
      .orderBy("testId")
      .orderBy("createdAt", "desc");
    const lastScreenshotDiffMap: Record<string, ScreenshotDiff> = {};
    for (const lastScreenshotDiff of lastScreenshotDiffs) {
      lastScreenshotDiffMap[lastScreenshotDiff.testId!] = lastScreenshotDiff;
    }
    return testIds.map((id) => lastScreenshotDiffMap[id] ?? null);
  });

const createLastScreenshotLoader = () =>
  new DataLoader<string, Screenshot | null>(async (testIds) => {
    const repository = await Repository.query()
      .whereIn(
        "id",
        Test.query()
          .select("repositoryId")
          .where("id", testIds[0] as string)
      )
      .first();
    const lastScreenshots = await Screenshot.query()
      .select("screenshots.*", "screenshotBucket.branch")
      .whereIn("testId", testIds as string[])
      .distinctOn("testId")
      .joinRelated("screenshotBucket")
      .orderBy("testId")
      .orderByRaw(
        `CASE WHEN "screenshotBucket".branch = ? THEN 0 ELSE 1 END`,
        repository!.referenceBranch
      )
      .orderBy("screenshots.createdAt", "desc");
    const lastScreenshotMap: Record<string, Screenshot> = {};
    for (const lastScreenshot of lastScreenshots) {
      lastScreenshotMap[lastScreenshot.testId!] = lastScreenshot;
    }
    return testIds.map((id) => lastScreenshotMap[id] ?? null);
  });

export const createLoaders = () => ({
  User: createModelLoader(User),
  Organization: createModelLoader(Organization),
  Screenshot: createModelLoader(Screenshot),
  ScreenshotBucket: createModelLoader(ScreenshotBucket),
  ScreenshotDiff: createModelLoader(ScreenshotDiff),
  Repository: createModelLoader(Repository),
  File: createModelLoader(File),
  BuildAggregatedStatus: createBuildAggregatedStatusLoader(),
  LastScreenshotDiff: createLastScreenshotDiffLoader(),
  LastScreenshot: createLastScreenshotLoader(),
});
