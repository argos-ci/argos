import { z } from "zod";

/**
 * Image content types supported for snapshots.
 *
 * These are raster formats that are safe to serve inline to a browser (they
 * cannot execute scripts). Vector formats such as `image/svg+xml` are
 * intentionally excluded because they can carry active content.
 */
export const IMAGE_SNAPSHOT_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

/**
 * Text content types supported for snapshots.
 *
 * These are compared as text and rendered as source code. They are never
 * served as active content (see the storage layer, which serves them as
 * neutralized downloads).
 */
export const TEXT_SNAPSHOT_CONTENT_TYPES = [
  "text/plain",
  "application/json",
  "application/yaml",
  "text/yaml",
  "application/xml",
  "text/xml",
  "text/html",
  "text/markdown",
  "text/css",
  "application/javascript",
  "text/javascript",
] as const;

/**
 * All content types supported for snapshots.
 */
export const SNAPSHOT_CONTENT_TYPES = [
  ...IMAGE_SNAPSHOT_CONTENT_TYPES,
  ...TEXT_SNAPSHOT_CONTENT_TYPES,
] as const;

export type SnapshotContentType = (typeof SNAPSHOT_CONTENT_TYPES)[number];

/**
 * Normalize a content type: lowercase, trimmed and stripped of any parameters
 * (e.g. `text/html; charset=utf-8` becomes `text/html`).
 */
export function normalizeContentType(contentType: string): string {
  return (contentType.split(";")[0] ?? "").trim().toLowerCase();
}

/**
 * Check if a (normalized) content type is an image.
 */
export function isImageContentType(contentType: string): boolean {
  return normalizeContentType(contentType).startsWith("image/");
}

/**
 * Check if a content type is a supported snapshot content type.
 */
export function isSnapshotContentType(
  contentType: string,
): contentType is SnapshotContentType {
  return (SNAPSHOT_CONTENT_TYPES as readonly string[]).includes(
    normalizeContentType(contentType),
  );
}

/**
 * Zod schema for a snapshot content type.
 *
 * The value is normalized (lowercased, parameters stripped) and validated
 * against the list of supported content types.
 */
export const SnapshotContentTypeSchema = z
  .string()
  .transform(normalizeContentType)
  .refine(isSnapshotContentType, {
    message: `Unsupported content type. Supported content types are: ${SNAPSHOT_CONTENT_TYPES.join(
      ", ",
    )}.`,
  })
  .meta({
    description: "Content type of the snapshot file",
    examples: ["image/png", "application/json", "text/plain"],
  });
