import {
  MediaContentTypeSchema,
  MediaVisibilitySchema,
} from "@argos/schemas/media";
import { z } from "zod";

import type { Media } from "@/database/models";
import { getMediaPosterUrl } from "@/media/serve";
import { getMediaMarkdown } from "@/media/url";
import { SHA256_REGEX } from "@/util/validation";

const MediaSlug = z
  .string()
  .min(1)
  .max(120)
  // The slug goes into a URL and into an index; keeping it to this shape means a
  // caller never has to wonder whether theirs needs escaping.
  .regex(/^[\w.-]+$/, {
    message:
      "A slug may only contain letters, digits, underscores, dots and dashes.",
  });

export const MediaId = z.string().meta({
  description: "The media ID",
  examples: ["4821"],
});

export const MediaSchema = z
  .object({
    id: z.string().meta({ description: "Unique identifier of the media" }),
    name: z.string().meta({ description: "Original file name" }),
    slug: z.string().nullable().meta({
      description:
        "Stable per-team identifier. Re-uploading the same slug replaces the file in place, keeping this URL valid.",
    }),
    url: z.url().meta({
      description:
        "Share page URL. This is the link to put in a pull request or a chat message.",
    }),
    markdown: z.string().meta({
      description:
        "Ready-to-paste Markdown. Images embed directly; videos embed their poster frame linked to the share page, because GitHub only renders inline players for media it hosts itself.",
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
        "When the media is deleted. Counted from the upload, not from the last view.",
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

export const MediaInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .meta({
      description: "File name, used for display and as the Markdown alt text.",
      examples: ["before.png", "checkout-flow.mp4"],
    }),
  contentType: MediaContentTypeSchema,
  size: z.number().int().min(1).meta({
    description:
      "Size of the file in bytes. Checked against your plan's limit before the upload is signed.",
  }),
  hash: z.string().regex(SHA256_REGEX).meta({
    description:
      "SHA-256 of the file contents, hex encoded. Uploading the same file twice is free: Argos recognizes the hash and skips the transfer.",
  }),
  slug: MediaSlug.nullish().meta({
    description:
      "Stable identifier, unique per team. Re-uploading the same slug replaces the file in place, so a Markdown embed already posted to a pull request never goes stale.",
    examples: ["pr-1234-checkout-before"],
  }),
  visibility: MediaVisibilitySchema.nullish(),
  retentionDays: z.number().int().min(1).max(365).nullish().meta({
    description:
      "How long to keep the media, in days. Clamped to your plan's maximum.",
  }),
});

/** Serialize a media for the REST API. */
export function serializeMedia(media: Media): MediaResponse {
  const posterUrl = getMediaPosterUrl(media);
  return {
    id: media.id,
    name: media.name,
    slug: media.slug,
    url: media.url,
    markdown: getMediaMarkdown({
      name: media.name,
      shareUrl: media.url,
      posterUrl,
      isVideo: media.isVideo(),
    }),
    posterUrl,
    contentType: media.mimeType,
    sizeBytes: media.size,
    width: media.width,
    height: media.height,
    visibility: media.visibility,
    status: getMediaStatus(media),
    expiresAt: media.expiresAt,
    createdAt: media.createdAt,
  };
}

export function serializeMediaList(list: Media[]): MediaResponse[] {
  return list.map(serializeMedia);
}

/**
 * Whether the bytes have landed. A media is fully usable the moment they have —
 * nothing happens to a file after upload.
 */
function getMediaStatus(media: Media): MediaResponse["status"] {
  return media.uploadedAt ? "ready" : "pending";
}
