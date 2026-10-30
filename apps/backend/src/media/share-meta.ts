import { type MediaVersion } from "@/database/models";

import { findMediaByShareToken } from "./query";
import { getMediaFileUrl, getMediaPosterUrl } from "./serve";
import { getMediaShareUrl } from "./url";
import { getLatestMediaVersion } from "./version";

/**
 * The widest an unfurled preview is served at.
 *
 * 1200px is the width every unfurler is built around, and the cap is not
 * cosmetic: a crawler fetches the image itself and drops one that is too large
 * (Twitter refuses over 5 MB), so an uncapped 4K screenshot unfurls as no image
 * at all. The CDN does the resize, so nothing is stored twice.
 */
const PREVIEW_MAX_WIDTH = 1200;

/** The picture an unfurler shows, and how big it is. */
type PreviewImage = {
  url: string;
  /** Null when the upload's dimensions were never recorded. */
  width: number | null;
  height: number | null;
  contentType: string;
};

/**
 * Everything needed to unfurl a share link, resolved for an anonymous visitor.
 *
 * Shared by the OpenGraph tags injected into the share page and by the oEmbed
 * endpoint, because the two describe the same thing and drifting apart means one
 * of them is wrong.
 */
export type MediaShareMeta = {
  name: string;
  description: string | null;
  shareUrl: string;
  image: PreviewImage;
  /** The file itself, for a video. Null for an image. */
  video: { url: string; contentType: string } | null;
};

/**
 * Resolve what a share link unfurls to, or `null` when it must not unfurl at
 * all.
 *
 * **Public media only.** Unfurl metadata is served to whoever asks — a crawler
 * carries no session, so there is nobody to authorize — which means everything
 * in it is public by construction. A `team` media's name alone can be the
 * unreleased information the link was kept private for, so it gets no tags and
 * no oEmbed answer, and the page it serves is the plain shell that asks the
 * visitor to sign in.
 *
 * A media whose bytes never landed resolves to `null` too: there is no picture
 * to show, and an unfurl advertising an image that 404s is worse than none.
 */
export async function getPublicMediaShareMeta(
  shareToken: string,
): Promise<MediaShareMeta | null> {
  const media = await findMediaByShareToken(shareToken);

  if (!media || media.visibility !== "public") {
    return null;
  }

  const version = await getLatestMediaVersion(media.id);

  if (!version) {
    return null;
  }

  const shareUrl = getMediaShareUrl(media.shareToken);

  return {
    name: media.name,
    description: media.description,
    shareUrl,
    image: getPreviewImage(version, shareUrl),
    video: version.isVideo()
      ? { url: getMediaFileUrl(version), contentType: version.mimeType }
      : null,
  };
}

/**
 * The still to unfurl: the image itself, or a video's poster frame — embedded
 * the way the Markdown embeds it, for the same reason.
 */
function getPreviewImage(
  version: MediaVersion,
  shareUrl: string,
): PreviewImage {
  const posterUrl = getMediaPosterUrl(version, shareUrl);

  return resizePreview(
    {
      url: posterUrl ?? getMediaFileUrl(version),
      width: version.width,
      height: version.height,
      // A poster is a JPEG whatever the video's own container: ImageKit's
      // `ik-thumbnail.jpg`, or the placeholder Argos serves until it exists.
      contentType: posterUrl ? "image/jpeg" : version.mimeType,
    },
    PREVIEW_MAX_WIDTH,
  );
}

/**
 * Constrain a preview to a maximum width, letting the CDN do the resize.
 *
 * Returned unchanged when it already fits, or when its dimensions were never
 * recorded: asking for a width we cannot report back would leave the declared
 * size disagreeing with the bytes, which is what makes an unfurl render at the
 * wrong shape.
 */
export function resizePreview(
  image: PreviewImage,
  maxWidth: number,
): PreviewImage {
  const { width, height } = image;

  if (!width || !height || width <= maxWidth) {
    return image;
  }

  return {
    ...image,
    url: withImageKitTransformation(image.url, `w-${maxWidth}`),
    width: maxWidth,
    // Rounded rather than floored so the reported shape stays as close to the
    // real one as the integers allow.
    height: Math.round((height * maxWidth) / width),
  };
}

/**
 * Add a transformation to an ImageKit URL, keeping any it already carries.
 *
 * A video poster arrives with `tr=so-1` on it already; overwriting that would
 * ask for a resize of the whole video rather than of the frame, and get back
 * nothing.
 */
function withImageKitTransformation(
  url: string,
  transformation: string,
): string {
  const parsed = new URL(url);
  const existing = parsed.searchParams.get("tr");
  parsed.searchParams.set(
    "tr",
    existing ? `${existing},${transformation}` : transformation,
  );
  return parsed.href;
}
