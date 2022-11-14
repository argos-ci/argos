import DataLoader from "dataloader";
import type { ModelClass } from "objection";

import {
  Build,
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

export const ScreenshotLoader = createModelLoader(Screenshot);
export const ScreenshotBucketLoader = createModelLoader(ScreenshotBucket);
export const ScreenshotDiffLoader = createModelLoader(ScreenshotDiff);
export const RepositoryLoader = createModelLoader(Repository);
export const FileLoader = createModelLoader(File);

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

export const buildLoader = new DataLoader<Build, AggregatedStatus>(
  async (builds) => {
    const reviewStatuses = await Build.getReviewStatuses(builds as Build[]);
    const conclusions = await Build.getConclusions(builds as Build[]);
    const statuses = await Build.getStatuses(builds as Build[]);

    return builds.map((_build, index) => {
      if (reviewStatuses[index]) return reviewStatuses[index];
      if (conclusions[index]) return conclusions[index];
      return statuses[index];
    }) as AggregatedStatus[];
  }
);
