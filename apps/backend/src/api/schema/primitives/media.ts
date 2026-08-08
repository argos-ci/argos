import {
  MediaContentTypeSchema,
  MediaStateSchema,
  MediaVisibilitySchema,
} from "@argos/schemas/media";
import { z } from "zod";

import type { Media, MediaVersion } from "@/database/models";
import { getMediaFileUrl, getMediaPosterUrl } from "@/media/serve";
import { getMediaMarkdown } from "@/media/url";
import { SHA256_REGEX } from "@/util/validation";

export const MediaId = z.string().meta({
  description: "The media ID",
  examples: ["4821"],
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
    url: z.url().meta({
      description:
        "Share page URL. This is the link to put in a pull request or a chat message, and it keeps working across versions — it always shows the newest one.",
    }),
    markdown: z.string().meta({
      description:
        "Ready-to-paste Markdown. Images embed directly; videos embed their poster frame linked to the share page, because GitHub only renders inline players for media it hosts itself.",
    }),
    version: z.number().meta({
      description:
        "Which version this response describes: 1 for a first upload, incrementing each time the same name is uploaded again.",
    }),
    versionCount: z.number().meta({
      description: "How many versions of this media exist.",
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
        "When this version is deleted. Counted from its upload, not from the last view.",
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
  retentionDays: z.number().int().min(1).max(365).nullish().meta({
    description:
      "How long to keep the media, in days. Clamped to your plan's maximum.",
  }),
});

/**
 * Serialize a media for the REST API, as of one of its versions.
 *
 * The version carries the bytes and everything read off them; the media carries
 * the identity and the share URL. A caller gets one flat object because that is
 * what it wants to act on — the newest screenshot, at a stable link.
 */
export function serializeMedia(
  media: Media,
  version: MediaVersion,
  versionCount: number,
): MediaResponse {
  const posterUrl = getMediaPosterUrl(version);
  return {
    id: media.id,
    name: media.name,
    state: media.state,
    description: media.description,
    url: media.url,
    markdown: getMediaMarkdown({
      name: media.name,
      shareUrl: media.url,
      posterUrl,
      isVideo: version.isVideo(),
    }),
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
