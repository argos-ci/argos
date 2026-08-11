import { Media, MediaVersion } from "@/database/models";
import logger from "@/logger";

import {
  deleteUnreferencedMediaDiffObjects,
  deleteUnreferencedMediaObjects,
  getMediaDiffObjects,
} from "./object";

/** Rows purged per pass, so one statement never locks the table for long. */
const BATCH_SIZE = 200;

/**
 * Delete expired media versions: the object and the row. A media left with no
 * versions goes too.
 *
 * Retention is about stored bytes, so it applies per version: an old version ages
 * out while the media and its newest version live on, and the share URL keeps
 * working. A media only disappears once every version of it has expired.
 *
 * Runs as a cron rather than a per-row scheduled job because expiry is a range
 * scan over one index, and because a version whose expiry passed while the worker
 * was down still has to go.
 *
 * The row is deleted last. A crash between the two leaves a row pointing at an
 * object that no longer exists, which the share page already handles (it reads as
 * expired); the reverse would leave objects nothing references — paid for forever.
 */
export async function purgeExpiredMedia(
  now: Date = new Date(),
): Promise<number> {
  let purged = 0;

  for (;;) {
    const batch = await MediaVersion.query()
      .where("expiresAt", "<=", now.toISOString())
      .orderBy("expiresAt", "asc")
      .limit(BATCH_SIZE);

    if (batch.length === 0) {
      return purged;
    }

    const ids = batch.map((version) => version.id);
    const mediaIds = [...new Set(batch.map((version) => version.mediaId))];

    // The before/after masks computed from these versions go with them. Their
    // rows cascade off the foreign key, but the objects are ours to collect, and
    // they have to be read before the cascade takes the rows that name them.
    const diffs = await getMediaDiffObjects(ids);

    // Keys are content-addressed, so one still referenced by a version that has
    // not expired must survive this batch. Two independent key namespaces, so
    // the two passes go together.
    await Promise.all([
      deleteUnreferencedMediaObjects({
        keys: batch.map((version) => version.key),
        excludeVersionIds: ids,
      }),
      deleteUnreferencedMediaDiffObjects({
        keys: diffs.keys,
        excludeDiffIds: diffs.diffIds,
      }),
    ]);

    await MediaVersion.query().delete().whereIn("id", ids);

    // A media is nothing without its bytes. Deleting it takes its comment threads
    // with it, which is correct: there is no longer an image to discuss.
    await Media.query()
      .delete()
      .whereIn("id", mediaIds)
      .whereNotExists(
        MediaVersion.query()
          .select(1)
          .whereColumn("media_versions.mediaId", "media.id"),
      );

    purged += batch.length;
    logger.info({ count: batch.length }, "Purged expired media versions");
  }
}
