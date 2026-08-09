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

/** How many uploaded versions each of these media has. */
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
