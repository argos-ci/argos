import {
  getMediaStage,
  MediaContentTypeSchema,
  MediaStageSchema,
  MediaStateSchema,
  MediaVisibilitySchema,
} from "@argos/schemas/media";
import { z } from "zod";

import type { Media, MediaVersion } from "@/database/models";
import {
  getMediaEmbedArgs,
  getMediaFileUrl,
  getMediaPosterUrl,
} from "@/media/serve";
import { getMediaMarkdown } from "@/media/url";
import { SHA256_REGEX } from "@/util/validation";

export const MediaId = z.string().meta({
  description: "The media ID",
  examples: ["4821"],
});

/**
 * One stored upload of a media.
 *
 * Behind `GET /media/{mediaId}/versions` rather than inlined on the media. Most
 * media have one version and most callers want the newest, which the media
 * already carries flattened onto it — so listing every version on every response
 * would pay for the rare case in every read. `versionCount` is the signal: a
 * caller that sees 1 never has to ask.
 *
 * The rare case is real, though. A comment records the version its author was
 * looking at, because a pin describes a spot on *those* bytes — feedback written
 * on v1 and resolved against v3 points at the wrong pixel. Acting on that
 * feedback is what this endpoint is for.
 */
export const MediaVersionSchema = z
  .object({
    id: z.string().meta({
      description:
        "Unique identifier of this version — what a comment's `mediaVersionId` points at.",
    }),
    number: z.number().meta({
      description:
        "1-based, and what the UI calls the version. Increments each time the same name is uploaded again.",
    }),
    fileUrl: z.url().meta({
      description: "URL of the image or video as it was at this version.",
    }),
    posterUrl: z.url().nullable().meta({
      description: "Poster frame of a video. Always `null` for images.",
    }),
    contentType: z.string(),
    sizeBytes: z.number(),
    width: z.number().nullable(),
    height: z.number().nullable(),
    expiresAt: z.string().nullable().meta({
      description:
        "When this version is deleted. Retention applies per version, so an old one ages out while the media and its share URL live on.",
    }),
    createdAt: z.string(),
  })
  .meta({
    description: "One uploaded version of a media",
    id: "MediaVersion",
  });

export const MediaSchema = z
  .object({
    id: z.string().meta({ description: "Unique identifier of the media" }),
    name: z.string().meta({
      description:
        "The media's name, and its identity within its pull request. Uploading the same name again adds a version.",
    }),
    state: MediaStateSchema.nullable(),
    description: z.string().nullable().meta({
      description: "Prose shown under the media in the pull request comment.",
    }),
    stage: MediaStageSchema,
    branch: z.string().nullable().meta({
      description:
        "Branch this media was uploaded for. Kept after publishing, as a record of where it came from.",
    }),
    prNumber: z.number().nullable().meta({
      description:
        "Pull request this media is published to, or `null` while it is staged.",
    }),
    url: z.url().meta({
      description:
        "Share page URL. This is the link to put in a pull request or a chat message, and it keeps working across versions — it always shows the newest one.",
    }),
    markdown: z.string().meta({
      description:
        "Ready-to-paste Markdown: the picture — the image itself, or a video's poster frame — embedded from the CDN and linked to the share page. Embed this rather than building your own from `url`: that is an HTML page, and an image embed pointing at it renders as a broken image.",
    }),
    version: z.number().meta({
      description:
        "Which version this response describes: 1 for a first upload, incrementing each time the same name is uploaded again.",
    }),
    versionCount: z.number().meta({
      description:
        "How many uploaded versions this media has. Above 1, `GET /media/{mediaId}/versions` lists them — which is how a comment's `mediaVersionId` resolves to the file it was written against.",
    }),
    fileUrl: z.url().meta({
      description:
        "URL of the image or video itself, for an agent that wants to look at it.",
    }),
    posterUrl: z.url().nullable().meta({
      description:
        "Poster frame of a video, derived by the image CDN. Always `null` for images.",
    }),
    contentType: z.string().meta({ description: "Content type of the media" }),
    sizeBytes: z.number().meta({ description: "Size of the media, in bytes" }),
    width: z.number().nullable().meta({ description: "Width, in pixels" }),
    height: z.number().nullable().meta({ description: "Height, in pixels" }),
    visibility: MediaVisibilitySchema,
    status: z.enum(["pending", "ready"]).meta({
      description:
        "`pending` until the bytes are uploaded, then `ready`. There is no processing step — Argos serves the bytes it was given.",
    }),
    expiresAt: z.string().nullable().meta({
      description:
        "When this version is deleted. Set from your plan's retention, counted from the upload rather than from the last view.",
    }),
    createdAt: z.string(),
  })
  .meta({
    description: "A standalone image or video uploaded to Argos",
    id: "Media",
  });

export type MediaResponse = z.infer<typeof MediaSchema>;

export const MediaUploadTargetSchema = z
  .object({
    url: z.url().meta({
      description: "URL to POST the file to, as `multipart/form-data`.",
    }),
    fields: z.record(z.string(), z.string()).meta({
      description:
        "Form fields that must be appended **before** the file part, in order, for the upload to be accepted.",
    }),
  })
  .meta({
    description: "Signed upload target",
    id: "MediaUploadTarget",
  });

export const MediaBranchSchema = z
  .string()
  .min(1)
  .max(255)
  .meta({
    description:
      "Branch this media belongs to. Upload against a branch when the pull request does not exist yet: the media is staged until one opens for that branch, and Argos publishes it — and posts the comment — on its own at that point. No GitHub connection is needed to name a branch.",
    examples: ["feat/checkout"],
  });

export const MediaInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .meta({
      description:
        "File name, used for display and as the Markdown alt text. Also the media's identity: uploading the same name on the same pull request adds a version rather than creating a second media.",
      examples: ["before.png", "checkout-flow.mp4"],
    }),
  state: MediaStateSchema.nullish(),
  description: z.string().max(2000).nullish().meta({
    description:
      "Prose shown under the media in the managed pull request comment.",
  }),
  contentType: MediaContentTypeSchema,
  size: z.number().int().min(1).meta({
    description:
      "Size of the file in bytes. Checked against your plan's limit before the upload is signed.",
  }),
  hash: z.string().regex(SHA256_REGEX).meta({
    description:
      "SHA-256 of the file contents, hex encoded. Uploading the same file twice is free: Argos recognizes the hash and skips the transfer, and byte-identical bytes do not create a new version.",
  }),
  visibility: MediaVisibilitySchema.nullish(),
});

/** Serialize one stored upload. */
export function serializeMediaVersion(
  version: MediaVersion,
): z.infer<typeof MediaVersionSchema> {
  return {
    id: version.id,
    number: version.number,
    fileUrl: getMediaFileUrl(version),
    posterUrl: getMediaPosterUrl(version),
    contentType: version.mimeType,
    sizeBytes: version.size,
    width: version.width,
    height: version.height,
    expiresAt: version.expiresAt,
    createdAt: version.createdAt,
  };
}

/**
 * Serialize a media for the REST API, as of one of its versions.
 *
 * The version carries the bytes and everything read off them; the media carries
 * the identity and the share URL. A caller gets one flat object because that is
 * what it wants to act on — the newest screenshot, at a stable link. The history
 * is a separate call, for the callers that need it.
 */
export function serializeMedia(
  media: Media,
  version: MediaVersion,
  versionCount: number,
  prNumber: number | null,
): MediaResponse {
  const posterUrl = getMediaPosterUrl(version);
  return {
    id: media.id,
    name: media.name,
    state: media.state,
    description: media.description,
    stage: getMediaStage(media),
    branch: media.branch,
    prNumber,
    url: media.url,
    markdown: getMediaMarkdown(
      getMediaEmbedArgs({ name: media.name, shareUrl: media.url, version }),
    ),
    version: version.number,
    versionCount,
    fileUrl: getMediaFileUrl(version),
    posterUrl,
    contentType: version.mimeType,
    sizeBytes: version.size,
    width: version.width,
    height: version.height,
    visibility: media.visibility,
    status: version.uploadedAt ? "ready" : "pending",
    expiresAt: version.expiresAt,
    createdAt: media.createdAt,
  };
}
