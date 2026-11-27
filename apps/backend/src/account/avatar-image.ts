import sharp from "sharp";

import { boom } from "@/util/error";

/** Stored width and height: the largest size any page displays, at 2x. */
const AVATAR_SIZE = 256;

/**
 * SVG is left out: rendering one means running an SVG renderer on markup the
 * caller wrote. The web app rasterizes an SVG before sending it.
 */
const ACCEPTED_FORMATS = new Set(["png", "jpeg", "webp", "gif"]);

/** A few KB of PNG can declare billions of pixels, all decoded in memory. */
const MAX_INPUT_PIXELS = 4096 * 4096;

async function readImageMetadata(input: Buffer) {
  try {
    return await sharp(input).metadata();
  } catch {
    return null;
  }
}

/**
 * Re-encode an image as a square PNG avatar.
 *
 * Every avatar goes through this, so what is stored is always an image Argos
 * produced, whatever bytes it was given.
 */
export async function renderAvatarImage(
  input: Buffer,
  options?: {
    /** Flattens transparency onto this color. */
    background?: string;
  },
): Promise<Buffer> {
  // Reading the header decodes no pixels, so it is safe before the size check.
  const metadata = await readImageMetadata(input);
  if (!metadata?.format || !ACCEPTED_FORMATS.has(metadata.format)) {
    throw boom(
      400,
      "This file is not an image Argos can read. Use a PNG, JPEG, WebP or GIF.",
    );
  }
  if (metadata.width * metadata.height > MAX_INPUT_PIXELS) {
    throw boom(
      400,
      "This image is too large. Use one up to 4096 by 4096 pixels.",
    );
  }
  const resized = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" });
  const flattened = options?.background
    ? resized.flatten({ background: options.background })
    : resized;
  return flattened.png().toBuffer();
}
