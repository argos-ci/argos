import { invariant } from "@argos/util/invariant";

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
 * Straight from the CDN once it has served the frame. Until then the CDN does
 * not fail cleanly — it answers `202` with an HTML page for as long as its
 * video processing takes — so the URL goes through Argos, which serves a
 * placeholder until the frame exists and the frame from then on. Whatever
 * renders it, a pull request comment included, shows a picture either way.
 */
export function getMediaPosterUrl(
  version: MediaVersion,
  shareUrl: string,
): string | null {
  if (!version.isVideo()) {
    return null;
  }
  if (version.posterReadyAt) {
    return getMediaPosterSourceUrl(version);
  }
  // Per version, so a re-upload never reuses a URL an image proxy has cached.
  return `${shareUrl}/poster/${version.number}.jpg`;
}

/**
 * Where the CDN serves a video's poster frame from, ready or not.
 *
 * Derived, not stored: the CDN extracts the frame from the video on request. That
 * means no ffmpeg on our side, no second object to upload, purge, or keep in step
 * with the media key — and a poster that cannot go stale, because it is computed
 * from whatever the key currently points at.
 */
export function getMediaPosterSourceUrl(version: MediaVersion): string {
  invariant(version.isVideo(), "only a video has a poster");
  const url = new URL(getImageKitUrl(version.key));
  // ImageKit's video-thumbnail endpoint: `<video-path>/ik-thumbnail.jpg`, with
  // `so` (start offset, in seconds) choosing the frame.
  url.pathname = `${url.pathname}/ik-thumbnail.jpg`;
  url.searchParams.set("tr", `so-${POSTER_SEEK_SECONDS}`);
  return url.href;
}

/**
 * The URL a browser fetches a before/after diff mask from.
 *
 * The same unauthenticated, content-addressed CDN URL the media themselves are
 * served from — the mask is drawn over one of them, so anything that can see the
 * pair can already see the pixels it marks.
 */
export function getMediaDiffUrl(key: string): string {
  return getImageKitUrl(key);
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
    posterUrl: getMediaPosterUrl(version, shareUrl),
    isVideo: version.isVideo(),
  };
}
