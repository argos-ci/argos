import type { Readable } from "node:stream";
import {
  isMediaContentType,
  isVideoMediaContentType,
} from "@argos/schemas/media";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

import config from "@/config";
import { getS3Client } from "@/storage/s3";

/**
 * How much of the uploaded object to read.
 *
 * Enough to identify any accepted format from its magic bytes, and — for images —
 * to reach the header that carries the dimensions. Sharp reads that header without
 * decoding a single pixel, so this costs well under a millisecond of CPU for a
 * file of any size. 64 KB covers a progressive JPEG's `SOF` marker with room to
 * spare.
 */
const INSPECT_BYTES = 64 * 1024;

/**
 * Thrown when the uploaded bytes are not what the caller declared them to be.
 *
 * Not retryable: no amount of retrying turns an HTML file into a PNG, and leaving
 * it serveable is the actual risk.
 */
export class MediaContentMismatchError extends Error {
  constructor(declared: string, detected: string | null) {
    super(
      `Uploaded bytes are ${detected ?? "of an unrecognized type"}, not the declared ${declared}.`,
    );
    this.name = "MediaContentMismatchError";
  }
}

export type MediaInspection = {
  /** Image dimensions when the header carries them; null for video. */
  width: number | null;
  height: number | null;
};

/**
 * Check what an uploaded file actually is, and read an image's dimensions.
 *
 * This is the whole of Argos's server-side handling of an uploaded file: one
 * ranged read of the first 64 KB. The bytes are never rewritten, transcoded or
 * re-encoded — the CDN derives what a browser needs on request.
 *
 * The check matters because nothing before it looks at the bytes. The upload
 * endpoint validates the content type the *caller declares*, and storage enforces
 * that the upload matches that declaration, but a caller can declare `image/png`
 * and upload HTML. Since media files are served from an unauthenticated CDN URL,
 * that would be an open redirect to attacker-controlled content on an Argos
 * domain. This is what closes it, and it runs before the media is serveable.
 */
export async function inspectMediaObject(args: {
  key: string;
  declaredContentType: string;
}): Promise<MediaInspection> {
  const header = await readObjectHeader(args.key);
  // `file-type` rather than our own magic-byte table: identifying a container is
  // a job with a long tail, and the tail is where a bypass would live. It reads
  // WebM's `DocType` instead of trusting the EBML magic every Matroska file
  // shares, and an ISO base media `ftyp` brand instead of assuming MP4 — two
  // distinctions a hand-rolled matcher gets wrong quietly.
  const detected = (await fileTypeFromBuffer(header))?.mime ?? null;

  if (!detected || !isMediaContentType(detected)) {
    throw new MediaContentMismatchError(args.declaredContentType, detected);
  }

  // An image declared and a video uploaded (or the reverse) is a mismatch that
  // matters: the media would be rendered by the wrong element and billed at the
  // wrong rate. Within a category the difference is cosmetic — a `.mov` that is
  // really an MP4 plays either way — so it is tolerated.
  const declaredIsVideo = isVideoMediaContentType(args.declaredContentType);
  if (isVideoMediaContentType(detected) !== declaredIsVideo) {
    throw new MediaContentMismatchError(args.declaredContentType, detected);
  }

  if (declaredIsVideo) {
    // A video's dimensions live in a `moov` atom that may sit at the end of the
    // file, so a header read cannot see them. The player reports them instead.
    return { width: null, height: null };
  }

  return readImageDimensions(header);
}

/** Read the leading bytes of an object, without pulling the whole thing. */
async function readObjectHeader(key: string): Promise<Buffer> {
  const result = await getS3Client().send(
    new GetObjectCommand({
      Bucket: config.get("s3.screenshotsBucket"),
      Key: key,
      Range: `bytes=0-${INSPECT_BYTES - 1}`,
    }),
  );

  const chunks: Buffer[] = [];
  for await (const chunk of result.Body as Readable) {
    chunks.push(Buffer.from(chunk as Buffer));
  }
  return Buffer.concat(chunks);
}

/**
 * Read an image's dimensions from its header.
 *
 * Tolerates failure: a format whose header sharp cannot parse from a truncated
 * buffer still uploads fine, it just renders without a reserved frame. Dimensions
 * are a layout nicety, not a reason to reject a file.
 */
async function readImageDimensions(header: Buffer): Promise<MediaInspection> {
  try {
    const metadata = await sharp(header).metadata();
    return {
      width: metadata.width ?? null,
      height: metadata.height ?? null,
    };
  } catch {
    return { width: null, height: null };
  }
}
