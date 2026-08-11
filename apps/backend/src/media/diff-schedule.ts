import { invariant } from "@argos/util/invariant";

import { Media, MediaDiff, MediaVersion } from "@/database/models";
import logger from "@/logger";

import { mediaDiffJob } from "./diff-job";
import { findMediaCounterpart } from "./pair";
import { getLatestMediaVersion } from "./version";

/**
 * The diff row for exactly these two versions, queueing it the first time.
 *
 * Idempotent, and it has to be: an upload schedules it, and the share page asks
 * for it on every load. The insert is atomic rather than gated on the lookup
 * above it — two uploads landing at once would both pass a check-then-insert —
 * and only the caller whose insert actually produced a row queues the job, so a
 * pair is never computed twice.
 *
 * Null when there is nothing to diff: a pair is only comparable when both halves
 * are images (videos have no mask, and Argos does not transcode them to make
 * one), and null too when the queue would not take the job — the pair is simply
 * left uncompared rather than recorded as pending forever.
 */
export async function ensureMediaDiff(args: {
  beforeVersion: MediaVersion;
  afterVersion: MediaVersion;
}): Promise<MediaDiff | null> {
  const { beforeVersion, afterVersion } = args;

  if (!beforeVersion.isImage() || !afterVersion.isImage()) {
    return null;
  }

  const identity = {
    beforeMediaVersionId: beforeVersion.id,
    afterMediaVersionId: afterVersion.id,
  };

  const existing = await MediaDiff.query().findOne(identity);
  if (existing) {
    return existing;
  }

  const [inserted] = await MediaDiff.query()
    .insert([{ ...identity, jobStatus: "pending" as const }])
    .onConflict(["beforeMediaVersionId", "afterMediaVersionId"])
    .ignore()
    .returning("*");

  if (!inserted) {
    // Lost the race. The row the winner inserted is the one to use, and the
    // winner has already queued it.
    const raced = await MediaDiff.query().findOne(identity);
    invariant(raced, "the pair was taken, so a diff exists for it");
    return raced;
  }

  try {
    await mediaDiffJob.push(inserted.id);
  } catch (error) {
    // The row is what makes this idempotent, so a row nobody queued would sit
    // `pending` forever and every later call would find it and queue nothing.
    // Taking it back leaves the pair uncompared, which the next upload — or the
    // next time the page is opened — retries from scratch.
    await MediaDiff.query().deleteById(inserted.id);
    logger.error(
      { error, mediaDiffId: inserted.id },
      "Failed to queue the media diff",
    );
    return null;
  }
  return inserted;
}

/**
 * Queue the diff for the pair this freshly uploaded version now forms.
 *
 * Called once per landed upload, which is what "reprocess the diff each time one
 * of the pair is renewed" comes down to: a new version is a new pair, and a new
 * pair is a new row. The half that did not change keeps whichever version is
 * currently its newest, so the diff always describes what the share page shows.
 *
 * Best-effort on purpose. The upload is finished and the caller already has a
 * working share URL; failing their request because a background comparison
 * could not be queued would trade a working feature for a missing one. The share
 * page schedules the pair again the next time it is opened.
 */
export async function scheduleMediaDiff(version: MediaVersion): Promise<void> {
  try {
    const media =
      version.media ?? (await Media.query().findById(version.mediaId));
    invariant(media, "no media for the version");

    if (!media.state) {
      return;
    }

    const counterpart = await findMediaCounterpart(media);
    if (!counterpart) {
      return;
    }

    const counterpartVersion = await getLatestMediaVersion(counterpart.id);
    if (!counterpartVersion) {
      return;
    }

    const [beforeVersion, afterVersion] =
      media.state === "before"
        ? [version, counterpartVersion]
        : [counterpartVersion, version];

    await ensureMediaDiff({ beforeVersion, afterVersion });
  } catch (error) {
    logger.error(
      { error, mediaVersionId: version.id },
      "Failed to schedule the media diff",
    );
  }
}
