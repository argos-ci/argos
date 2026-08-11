import { invariant } from "@argos/util/invariant";

import { Media, MediaDiff, MediaVersion } from "@/database/models";
import logger from "@/logger";

import { mediaDiffJob } from "./diff-job";
import { findMediaCounterpart } from "./pair";
import { getLatestMediaVersion } from "./version";

/**
 * How long a diff may sit unfinished before another caller queues it again.
 *
 * Comfortably past the job's own budget (60s) and its retry ladder (10s, 1m,
 * 5m), so a job that is merely slow is never queued twice — and short enough
 * that a pair stranded by a broker outage, a worker restart, or a job that
 * exhausted its retries is picked up the next time anyone looks at it.
 */
const REQUEUE_AFTER_MS = 10 * 60 * 1000;

/**
 * Whether a diff that already exists should be handed to the queue again.
 *
 * Anything but `complete` is unfinished, and unfinished past the window means
 * nobody is working on it: the push was lost, the worker died mid-job, or the
 * retry ladder ran out. Bounded by the window rather than retried on sight, so a
 * pair that genuinely cannot be computed is attempted once every ten minutes
 * instead of on every page load.
 */
function checkNeedsQueueing(diff: MediaDiff, now: number): boolean {
  if (diff.jobStatus === "complete") {
    return false;
  }
  return now - Date.parse(diff.updatedAt) > REQUEUE_AFTER_MS;
}

/**
 * Hand a diff to the queue without making the caller wait for the broker.
 *
 * Deliberately not awaited. This runs on the share page's read path, and
 * `push` opens an AMQP channel on first use — with a broker that is down, its
 * retry ladder can hold a caller for minutes. A page whose job is to show two
 * images already on the CDN must not be able to hang on the message broker.
 *
 * A push that never lands leaves the row unfinished, which
 * {@link checkNeedsQueueing} picks up later. That is the same recovery a worker
 * crash gets, so it needs no path of its own.
 */
function queueMediaDiff(diffId: string): void {
  mediaDiffJob.push(diffId).catch((error: unknown) => {
    logger.error(
      { error, mediaDiffId: diffId },
      "Failed to queue the media diff",
    );
  });
}

/**
 * The diff row for exactly these two versions, queueing it when nobody else is.
 *
 * Idempotent, and it has to be: an upload schedules it, and the share page asks
 * for it on every load. The insert is atomic rather than gated on the lookup
 * above it — two uploads landing at once would both pass a check-then-insert —
 * and a row that already exists is only re-queued once it has gone stale, so a
 * pair in flight is never computed twice.
 *
 * Null when there is nothing to diff: a pair is only comparable when both halves
 * are images. Videos have no mask, and Argos does not transcode them to make
 * one.
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
    if (checkNeedsQueueing(existing, Date.now())) {
      // Touched before the push, not after: the window has to restart even when
      // the queue is still unreachable, or every caller from here on re-pushes.
      const requeued = await existing
        .$query()
        .patchAndFetch({ jobStatus: "pending" });
      queueMediaDiff(requeued.id);
      return requeued;
    }
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

  queueMediaDiff(inserted.id);
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
export async function scheduleMediaDiff(
  version: MediaVersion,
  media: Media,
): Promise<void> {
  try {
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
