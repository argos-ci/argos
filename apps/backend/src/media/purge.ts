import { Media } from "@/database/models";
import logger from "@/logger";

import { deleteUnreferencedMediaObjects } from "./object";

/** Rows purged per pass, so one statement never locks the table for long. */
const BATCH_SIZE = 200;

/**
 * Delete expired media: the object and the row.
 *
 * Runs as a cron rather than a per-row scheduled job because expiry is a range
 * scan over one index, and because a media whose expiry passed while the worker
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
    const batch = await Media.query()
      .where("expiresAt", "<=", now.toISOString())
      .orderBy("expiresAt", "asc")
      .limit(BATCH_SIZE);

    if (batch.length === 0) {
      return purged;
    }

    const ids = batch.map((media) => media.id);

    // Keys are content-addressed, so one still referenced by a media that has not
    // expired must survive this batch.
    await deleteUnreferencedMediaObjects({
      keys: batch.map((media) => media.key),
      excludeMediaIds: ids,
    });

    await Media.query().delete().whereIn("id", ids);

    purged += batch.length;
    logger.info({ count: batch.length }, "Purged expired media");
  }
}
