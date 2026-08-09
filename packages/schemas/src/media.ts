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
 * QuickTime is accepted because it is what macOS screen recordings and Playwright
 * on macOS produce. Argos does not transcode, so a container a browser cannot
 * play back (ProRes, some HEVC exports) is stored and served as a download rather
 * than played inline — the caller is responsible for exporting H.264 if it needs
 * to play in a pull request.
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
 * How far along a media is towards being shown on a pull request.
 *
 * - `draft` — attached to a branch, with no pull request yet. Real and shareable,
 *   but nothing has been posted anywhere. This is what lets an agent upload while
 *   it is still working: the screenshots exist before the pull request does.
 * - `published` — attached to a pull request, and listed in the comment Argos
 *   maintains on it. Reached either by uploading with a pull request number, or
 *   by opening the pull request for a branch that has drafts waiting.
 *
 * Derived from whether a pull request is attached rather than stored, so it can
 * never disagree with the attachment it describes.
 */
export const MEDIA_STAGES = ["draft", "published"] as const;

export const MediaStageSchema = z.enum(MEDIA_STAGES).meta({
  description:
    "`draft` while the media is only attached to a branch, `published` once a pull request is attached and Argos lists it in that pull request's comment. A media attached to neither is `draft`.",
});

export type MediaStage = z.infer<typeof MediaStageSchema>;

/** A media's stage, which is exactly "is a pull request attached". */
export function getMediaStage(media: {
  githubPullRequestId: string | null;
}): MediaStage {
  return media.githubPullRequestId ? "published" : "draft";
}

/**
 * Which half of a before/after pair a media is, if it is half of one.
 *
 * Part of a media's identity alongside its name, so `checkout.png` before and
 * `checkout.png` after are two media rather than two versions of one — and the
 * pair can be shown side by side and compared. A media that stands alone has no
 * state.
 */
export const MEDIA_STATES = ["before", "after"] as const;

export const MediaStateSchema = z.enum(MEDIA_STATES).meta({
  description:
    "Which half of a before/after pair this media is, so the two can be shown side by side and compared. Inferred from a file name ending in `-before` or `-after`.",
});

export type MediaState = z.infer<typeof MediaStateSchema>;

/**
 * Read the before/after state out of a file name, and return the name without it.
 *
 * `checkout-before.png` is a reviewer saying "this is the before", not a file
 * literally called that, so the state is lifted off and the two halves of a pair
 * share one name — which is what lets them be matched up and compared. An explicit
 * `--state` overrides this; nothing here guesses when the suffix is absent.
 */
export function parseMediaStateFromName(fileName: string): {
  name: string;
  state: MediaState | null;
} {
  const match = /^(.*)-(before|after)(\.[^.]+)?$/i.exec(fileName);
  if (!match) {
    return { name: fileName, state: null };
  }
  const [, stem, state, extension] = match;
  // The capture groups are guaranteed by the pattern, but the compiler cannot see
  // that through a regex.
  if (stem === undefined || state === undefined) {
    return { name: fileName, state: null };
  }
  const normalized = state.toLowerCase();
  return {
    name: `${stem}${extension ?? ""}`,
    state: normalized === "before" ? "before" : "after",
  };
}

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
