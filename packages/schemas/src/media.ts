import { z } from "zod";

import {
  IMAGE_SNAPSHOT_CONTENT_TYPES,
  normalizeContentType,
} from "./content-type";

/**
 * Image content types accepted for a standalone media upload.
 *
 * Same raster-only list as snapshots: these cannot carry active content, so they
 * are safe to serve inline from the storage origin. Vector formats
 * (`image/svg+xml`) stay out for that reason.
 */
export const IMAGE_MEDIA_CONTENT_TYPES = IMAGE_SNAPSHOT_CONTENT_TYPES;

/**
 * Video content types accepted for a standalone media upload.
 *
 * QuickTime is accepted because it is what macOS screen recordings and
 * Playwright on macOS produce, but it is not what gets served: the processing
 * worker transcodes anything that isn't H.264-in-MP4 so browsers can actually
 * play it back.
 */
export const VIDEO_MEDIA_CONTENT_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

/** All content types accepted for a standalone media upload. */
export const MEDIA_CONTENT_TYPES = [
  ...IMAGE_MEDIA_CONTENT_TYPES,
  ...VIDEO_MEDIA_CONTENT_TYPES,
] as const;

export type MediaContentType = (typeof MEDIA_CONTENT_TYPES)[number];

/** Check if a content type is an accepted video content type. */
export function isVideoMediaContentType(contentType: string): boolean {
  return (VIDEO_MEDIA_CONTENT_TYPES as readonly string[]).includes(
    normalizeContentType(contentType),
  );
}

/** Check if a content type is accepted for a standalone media upload. */
export function isMediaContentType(
  contentType: string,
): contentType is MediaContentType {
  return (MEDIA_CONTENT_TYPES as readonly string[]).includes(
    normalizeContentType(contentType),
  );
}

/**
 * Zod schema for a media content type. The value is normalized (lowercased,
 * parameters stripped) before being validated.
 */
export const MediaContentTypeSchema = z
  .string()
  .transform(normalizeContentType)
  .refine(isMediaContentType, {
    message: `Unsupported content type. Supported content types are: ${MEDIA_CONTENT_TYPES.join(", ")}.`,
  })
  .meta({
    description: "Content type of the media file",
    examples: ["image/png", "video/mp4"],
  });

/**
 * Who can open a media share page.
 *
 * - `team` — requires an Argos session with access to the owning account. This
 *   is the default, and the reason a private repository's screenshots don't
 *   become world-readable by being uploaded.
 * - `public` — anyone holding the (unguessable) share URL. Needed when the
 *   reviewers of a pull request have no Argos account.
 */
export const MEDIA_VISIBILITIES = ["team", "public"] as const;

export const MediaVisibilitySchema = z.enum(MEDIA_VISIBILITIES).meta({
  description:
    "Who can open the media share page. `team` requires an Argos session with access to the owning account; `public` only requires the share URL.",
});

export type MediaVisibility = z.infer<typeof MediaVisibilitySchema>;

/**
 * What one media upload costs on the screenshot meter.
 *
 * Standalone media is billed on the existing screenshot meter rather than on a
 * meter of its own, so it lands on the invoice line accounts already understand
 * and inherits the spend-management thresholds unchanged. A video costs more
 * than an image because it costs more to store and to serve: a 20 MB video kept
 * for 90 days and viewed ~10 times is ~$0.02 of storage and egress, which the
 * 25 units bill at ~$0.10.
 */
export const MEDIA_UNITS = {
  image: 1,
  video: 25,
} as const;

/** The number of screenshot units one media of this content type costs. */
export function getMediaUnits(contentType: string): number {
  return isVideoMediaContentType(contentType)
    ? MEDIA_UNITS.video
    : MEDIA_UNITS.image;
}
