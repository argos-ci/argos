import type { MediaVersion } from "@/database/models";
import { getImageKitUrl } from "@/storage";

import type { MediaEmbedArgs } from "./url";

/**
 * Seconds into a video to grab the poster frame from.
 *
 * Not frame zero: recordings very often open on a blank page or a white flash,
 * and a blank poster reads as a broken embed in a pull request comment.
 */
const POSTER_SEEK_SECONDS = 1;

/**
 * The URL a browser — or GitHub — fetches the media bytes from.
 *
 * Always the image CDN, never a signed origin URL, and unauthenticated whatever
 * the media's visibility. That is a deliberate consequence of the feature's whole
 * point: GitHub renders an embedded image by fetching it **server-side** through
 * its camo proxy, which carries no Argos session. A URL that requires auth cannot
 * be embedded in a pull request — not "renders worse", cannot render at all. So
 * the bytes are protected by an unguessable content-addressed key rather than by
 * a session, exactly as Argos already serves screenshots.
 *
 * A media's `visibility` therefore governs the **share page**, not the file:
 * `team` means the branded page (project context, expiry, delete) needs a session.
 */
export function getMediaFileUrl(version: MediaVersion): string {
  return getImageKitUrl(version.key);
}

/**
 * The URL of a video's poster frame, or `null` for an image.
 *
 * Derived, not stored: the CDN extracts the frame from the video on request. That
 * means no ffmpeg on our side, no second object to upload, purge, or keep in step
 * with the media key — and a poster that cannot go stale, because it is computed
 * from whatever the key currently points at.
 */
export function getMediaPosterUrl(version: MediaVersion): string | null {
  if (!version.isVideo()) {
    return null;
  }
  const url = new URL(getImageKitUrl(version.key));
  // ImageKit's video-thumbnail endpoint: `<video-path>/ik-thumbnail.jpg`, with
  // `so` (start offset, in seconds) choosing the frame.
  url.pathname = `${url.pathname}/ik-thumbnail.jpg`;
  url.searchParams.set("tr", `so-${POSTER_SEEK_SECONDS}`);
  return url.href;
}

/**
 * Everything a Markdown embed of a media needs, read off the version whose bytes
 * it should show.
 *
 * One helper because every caller that renders an embed — the pull request
 * comment, the REST response, the share page's copy formats — has to derive the
 * same three URLs from a version, and a caller that derives them itself is a
 * caller that can point the embed at the share page again.
 */
export function getMediaEmbedArgs(args: {
  name: string;
  shareUrl: string;
  version: MediaVersion;
}): MediaEmbedArgs {
  const { name, shareUrl, version } = args;
  return {
    name,
    shareUrl,
    fileUrl: getMediaFileUrl(version),
    posterUrl: getMediaPosterUrl(version),
    isVideo: version.isVideo(),
    width: version.width,
    height: version.height,
  };
}
