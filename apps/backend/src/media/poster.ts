import { invariant } from "@argos/util/invariant";
import sharp from "sharp";

import { Media, MediaVersion } from "@/database/models";
import logger from "@/logger";

import { updatePullRequestComment } from "./pull-request-comment";
import { getMediaPosterSourceUrl } from "./serve";
import { getLatestMediaVersion } from "./version";

/**
 * How long a probe waits on the CDN. ImageKit holds a request for a frame it is
 * still extracting for about 15 seconds before answering `202`, and a shorter
 * timeout would cut off the answers that arrive with the frame.
 */
export const POSTER_PROBE_TIMEOUT_MS = 30_000;

/**
 * How long after an upload the sweep keeps asking for its poster. Past it, a
 * video the CDN never produced a frame for stays on a plain link. The migration
 * that introduced `posterReadyAt` marks everything older than this ready.
 */
const SWEEP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Videos probed per sweep, so a backlog cannot hold one run for long. */
const SWEEP_BATCH_SIZE = 20;

/**
 * Ask the CDN for a video's poster frame, and mark it ready once the answer is
 * an image. Returns whether the poster is ready.
 *
 * The frame also gives the video its dimensions, which the upload check cannot
 * read: they live in a `moov` atom that may sit at the end of the file. Without
 * them the player's frame has no shape until the video's own metadata loads.
 *
 * A pull request comment that went up while the frame was missing showed a
 * plain link in its place, so it is rebuilt now that there is a picture.
 */
export async function refreshMediaPoster(
  version: MediaVersion,
): Promise<boolean> {
  if (version.posterReadyAt) {
    return true;
  }

  const url = getMediaPosterSourceUrl(version);
  invariant(url, "only a video has a poster");

  const frame = await fetchPosterFrame(url);
  if (!frame) {
    return false;
  }

  const patched = await MediaVersion.query()
    .findById(version.id)
    .whereNull("posterReadyAt")
    .patch({
      posterReadyAt: new Date().toISOString(),
      width: frame.width,
      height: frame.height,
    });

  // Another probe got there first, and refreshed the comment itself.
  if (patched === 0) {
    return true;
  }

  await refreshPullRequestComment(version);
  return true;
}

/**
 * Probe the recent videos whose poster is still missing.
 *
 * The safety net under the probe queued at upload, which gets a single try.
 * When ImageKit's video processing stalls it keeps answering `202` — on
 * 2026-10-29 it still was a quarter of an hour after the upload — and the
 * frame is picked up here whenever it finally turns up.
 */
export async function sweepMediaPosters(now: Date = new Date()): Promise<void> {
  const pending = await MediaVersion.query()
    .whereNull("posterReadyAt")
    // Spelled as the partial index's predicate, so the planner can use it.
    .whereRaw(`"mimeType" LIKE 'video/%'`)
    .where(
      "uploadedAt",
      ">",
      new Date(now.getTime() - SWEEP_WINDOW_MS).toISOString(),
    )
    .orderBy("uploadedAt", "desc")
    .limit(SWEEP_BATCH_SIZE);

  // In parallel: a stalled CDN holds every probe for its full 15 seconds.
  await Promise.all(
    pending.map(async (version) => {
      try {
        await refreshMediaPoster(version);
      } catch (error) {
        logger.error(
          { error, mediaVersionId: version.id },
          "Failed to probe a media poster",
        );
      }
    }),
  );
}

type PosterFrame = { width: number | null; height: number | null };

/**
 * Fetch a poster frame, or `null` while the CDN has none. A timeout is the CDN
 * stalling seen from our side: not an error, the frame just isn't there yet.
 */
async function fetchPosterFrame(url: string): Promise<PosterFrame | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(POSTER_PROBE_TIMEOUT_MS),
    });
    return await readPosterFrame(response);
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return null;
    }
    throw error;
  }
}

/**
 * The frame's size when the CDN answered with one, `null` otherwise.
 *
 * Only a `200` carrying an image counts. ImageKit's "being prepared" answer is
 * a `202` with an HTML body, and its answer for a file it cannot take a frame
 * from is a `400` with one.
 */
export async function readPosterFrame(
  response: Response,
): Promise<PosterFrame | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status !== 200 || !contentType.startsWith("image/")) {
    await response.body?.cancel();
    return null;
  }

  const metadata = await sharp(
    Buffer.from(await response.arrayBuffer()),
  ).metadata();
  return { width: metadata.width ?? null, height: metadata.height ?? null };
}

/**
 * Rebuild the pull request comment showing this version, if there is one. Only
 * for the version the comment shows: an older one's poster changes nothing in
 * it, and every update spends the installation's shared GitHub API budget.
 */
async function refreshPullRequestComment(version: MediaVersion): Promise<void> {
  const media = await Media.query().findById(version.mediaId);
  if (!media?.githubPullRequestId) {
    return;
  }
  const latest = await getLatestMediaVersion(media.id);
  if (latest?.id !== version.id) {
    return;
  }
  await updatePullRequestComment(media.githubPullRequestId);
}
