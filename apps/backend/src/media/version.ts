import { MediaVersion } from "@/database/models";
import { boom } from "@/util/error";

/**
 * The newest uploaded version of each of these media.
 *
 * `DISTINCT ON` rather than a denormalized `latestVersionId` on `media`: a pointer
 * is a second source of truth that a failed upload or a retention purge can leave
 * describing a version that is gone, and every write path would have to remember
 * to move it. Here the newest version is derived, so it cannot be stale.
 *
 * Only uploaded versions count. A row created to sign an upload that never
 * completed must not become "the latest version" and blank out a share page that
 * was working a moment ago.
 */
export async function getLatestMediaVersions(
  mediaIds: string[],
): Promise<Map<string, MediaVersion>> {
  if (mediaIds.length === 0) {
    return new Map();
  }

  const versions = await MediaVersion.query()
    .distinctOn("mediaId")
    .whereIn("mediaId", mediaIds)
    .whereNotNull("uploadedAt")
    .orderBy("mediaId")
    .orderBy("number", "desc");

  return new Map(versions.map((version) => [version.mediaId, version]));
}

/** The newest uploaded version of one media, or null if none has landed yet. */
export async function getLatestMediaVersion(
  mediaId: string,
): Promise<MediaVersion | null> {
  const version = await MediaVersion.query()
    .where("mediaId", mediaId)
    .whereNotNull("uploadedAt")
    .orderBy("number", "desc")
    .first();
  return version ?? null;
}

/**
 * The newest version of one media, uploaded or not.
 *
 * Distinct from {@link getLatestMediaVersion}, and the distinction matters: for
 * anything a viewer looks at, a version whose bytes never landed must not become
 * "the latest" and blank out a share page that was working a moment ago. But a
 * media whose *only* version is still pending is a real, addressable row — it
 * has an id, a share URL and a branch — and the API has to be able to describe
 * it rather than fail on it.
 */
export async function getNewestMediaVersion(
  mediaId: string,
): Promise<MediaVersion | null> {
  const version = await MediaVersion.query()
    .where("mediaId", mediaId)
    .orderBy("number", "desc")
    .first();
  return version ?? null;
}

/**
 * How many uploaded versions each of these media has.
 *
 * On every media response, because it is what tells a caller whether the history
 * is worth a second call at all — most media have one version, and a caller that
 * sees 1 never asks.
 */
export async function getMediaVersionCounts(
  mediaIds: string[],
): Promise<Map<string, number>> {
  if (mediaIds.length === 0) {
    return new Map();
  }

  const rows = await MediaVersion.query()
    .select("mediaId")
    .count({ count: "*" })
    .whereIn("mediaId", mediaIds)
    .whereNotNull("uploadedAt")
    .groupBy("mediaId")
    .castTo<{ mediaId: string; count: string }[]>();

  return new Map(rows.map((row) => [row.mediaId, Number(row.count)]));
}

/**
 * How many versions one listing returns.
 *
 * Versions accumulate without bound — a CI job re-running against a long-lived
 * branch appends one per run — and every sibling read path is capped: the media
 * list paginates, the pull request comment stops at 20. An uncapped fan-out here
 * would let one request pull a media's entire history in a single response.
 *
 * Newest first, so the cap drops the oldest — which is the right end to lose. A
 * comment old enough to point past this is pointing at bytes retention has
 * probably already collected.
 */
const MAX_LISTED_VERSIONS = 100;

/**
 * The most recent uploaded versions of one media, newest first.
 *
 * Unfinalized versions are left out: those rows exist to sign an upload, and
 * listing one hands out a URL for bytes that are not there.
 */
export async function getMediaVersions(
  mediaId: string,
): Promise<MediaVersion[]> {
  return MediaVersion.query()
    .where("mediaId", mediaId)
    .whereNotNull("uploadedAt")
    .orderBy("number", "desc")
    .limit(MAX_LISTED_VERSIONS);
}

/**
 * Which version a comment is about.
 *
 * A pin describes a spot on the bytes its author was looking at, so the version
 * has to be recorded rather than assumed: the share page lets a reviewer step back
 * through the history, and a comment written on v1 that claimed to be about v3
 * would point at the wrong pixel.
 *
 * A requested version must belong to this media — accepting any id would let a
 * caller attach their comment to someone else's upload.
 */
export async function resolveCommentMediaVersionId(args: {
  media: { id: string };
  requested: string | null;
}): Promise<string | null> {
  const { media, requested } = args;

  if (requested) {
    const version = await MediaVersion.query()
      .findById(requested)
      .where("mediaId", media.id);
    if (!version) {
      throw boom(400, "That version does not belong to this media.");
    }
    return version.id;
  }

  const latest = await getLatestMediaVersion(media.id);
  return latest?.id ?? null;
}
