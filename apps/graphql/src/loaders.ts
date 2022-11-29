import DataLoader from "dataloader";
import type { ModelClass } from "objection";

import {
  Build,
  User,
  Organization,
  File,
  Model,
  Repository,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
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

export const createLoaders = () => ({
  User: createModelLoader(User),
  Organization: createModelLoader(Organization),
  Screenshot: createModelLoader(Screenshot),
  ScreenshotBucket: createModelLoader(ScreenshotBucket),
  ScreenshotDiff: createModelLoader(ScreenshotDiff),
  Repository: createModelLoader(Repository),
  File: createModelLoader(File),
  BuildAggregatedStatus: createBuildAggregatedStatusLoader(),
});
