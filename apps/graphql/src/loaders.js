import DataLoader from "dataloader";
import {
  Build,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  Repository,
} from "@argos-ci/database/models";

const createModelLoader = (Model) => {
  return new DataLoader(async (ids) => {
    const models = await Model.query().findByIds(ids);
    return ids.map((id) => models.find((model) => model.id === id));
  });
};

export const ScreenshotLoader = createModelLoader(Screenshot);
export const ScreenshotBucketLoader = createModelLoader(ScreenshotBucket);
export const ScreenshotDiffLoader = createModelLoader(ScreenshotDiff);
export const RepositoryLoader = createModelLoader(Repository);

export const buildLoader = new DataLoader(async (builds) => {
  const reviewStatuses = await Build.getReviewStatuses(builds);
  const conclusions = await Build.getConclusions(builds);
  const statuses = await Build.getStatuses(builds);

  return builds.map((build, index) => {
    if (reviewStatuses[index]) return reviewStatuses[index];
    if (conclusions[index]) return conclusions[index];
    return statuses[index];
  });
});
