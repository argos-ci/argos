import DataLoader from "dataloader";
import {
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
