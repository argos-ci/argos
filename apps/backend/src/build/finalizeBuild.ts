import { TransactionOrKnex } from "objection";

import { Build, Screenshot } from "@/database/models/index.js";

/**
 * Finalize a build.
 */
export async function finalizeBuild(input: {
  trx?: TransactionOrKnex;
  build: Build;
}) {
  const screenshotCount = await Screenshot.query(input.trx)
    .where("screenshotBucketId", input.build.compareScreenshotBucketId)
    .resultSize();
  await input.build
    .$relatedQuery("compareScreenshotBucket", input.trx)
    .patch({ complete: true, screenshotCount });
}
