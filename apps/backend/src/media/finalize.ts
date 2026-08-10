import { getMediaUnits } from "@argos/schemas/media";

import { MediaVersion } from "@/database/models";
import { boom } from "@/util/error";

import { inspectMediaObject, MediaContentMismatchError } from "./inspect";
import { deleteUnreferencedMediaObjects, headMediaObject } from "./object";

/**
 * Mark a version's bytes as landed and make it serveable.
 *
 * Everything here is cheap enough to run inside the request: one `HEAD` for the
 * real size, and one 64 KB ranged read to check the file is what it claims and to
 * pick up an image's dimensions. There is no background processing — the bytes are
 * served exactly as uploaded, and the CDN derives WebP/AVIF variants and video
 * posters on request.
 *
 * Doing the check inline rather than in a worker is also better behaviour: a file
 * that isn't what it claims is rejected *before* the caller is handed a working
 * URL, instead of being quarantined a few seconds later.
 */
export async function finalizeMedia(
  version: MediaVersion,
): Promise<MediaVersion> {
  if (version.uploadedAt) {
    return version;
  }

  const head = await headMediaObject(version.key);

  if (!head) {
    throw boom(
      400,
      "The file has not been uploaded yet. Upload it to the signed URL returned by the create call, then finalize again.",
    );
  }

  const inspection = await inspectMediaObject({
    key: version.key,
    declaredContentType: version.mimeType,
  }).catch(async (error: unknown) => {
    if (error instanceof MediaContentMismatchError) {
      // Drop the bytes and refuse. The row stays — with `uploadedAt` still null it
      // is not serveable, and the caller gets told why.
      await deleteUnreferencedMediaObjects({
        keys: [version.key],
        excludeVersionIds: [version.id],
      });
      throw boom(400, error.message);
    }
    throw error;
  });

  // The size is read back from storage rather than trusted from the caller: the
  // signed policy caps it, but the caller's declared size is what the quota was
  // checked against, so what gets billed has to be what actually arrived.
  return version.$query().patchAndFetch({
    sizeBytes: String(head.size),
    width: inspection.width,
    height: inspection.height,
    uploadedAt: new Date().toISOString(),
    billedUnits: getMediaUnits(version.mimeType),
  });
}
