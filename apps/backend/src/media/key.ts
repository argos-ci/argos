import { normalizeContentType } from "@argos/schemas/content-type";

/**
 * Extension used for each accepted content type.
 *
 * Derived from the content type, never from the uploaded file name: the name is
 * caller-controlled, and a key built from it would let a caller pick the
 * extension S3 stores — and, through it, what a CDN in front of the bucket
 * decides to serve.
 */
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

/** The file extension to store a given content type under, without the dot. */
function getExtensionForContentType(contentType: string): string {
  return EXTENSION_BY_CONTENT_TYPE[normalizeContentType(contentType)] ?? "bin";
}

/**
 * The S3 key for a media's bytes.
 *
 * Content-addressed, so the same bytes always land on the same key and a CDN in
 * front of the bucket can cache it indefinitely. Namespaced by project so a
 * purge or an audit can be scoped without a database round trip — and so a
 * project transfer moves its objects' logical owner with it.
 */
export function getMediaKey(args: {
  projectId: string;
  hash: string;
  contentType: string;
}): string {
  const extension = getExtensionForContentType(args.contentType);
  return `media/${args.projectId}/${args.hash}.${extension}`;
}

/**
 * The S3 key for the diff mask between the two halves of a before/after pair.
 *
 * Content-addressed on the mask's own bytes, like a media's, so two pairs that
 * changed in the same way share one object — a screenshot re-uploaded unchanged
 * across pull requests produces the same mask every time. Under a `diffs/`
 * segment of the project's own prefix so a purge or an audit can tell derived
 * bytes from uploaded ones without reading the database.
 */
export function getMediaDiffKey(args: {
  projectId: string;
  hash: string;
}): string {
  return `media/${args.projectId}/diffs/${args.hash}.png`;
}
