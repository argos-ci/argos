/**
 * Identify a file from its leading bytes, matching them against the signatures of
 * the accepted media types.
 *
 * Returns `null` when the bytes match nothing we accept, which is itself the
 * answer that matters: unrecognized means rejected.
 */
export function detectContentType(header: Buffer): string | null {
  if (startsWith(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWith(header, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (matchesAscii(header, 0, "GIF87a") || matchesAscii(header, 0, "GIF89a")) {
    return "image/gif";
  }
  // RIFF....WEBP
  if (matchesAscii(header, 0, "RIFF") && matchesAscii(header, 8, "WEBP")) {
    return "image/webp";
  }
  // Matroska/WebM share the EBML magic; only WebM is accepted, and ffprobe is
  // what settles the difference — the container is identical at byte level.
  if (startsWith(header, [0x1a, 0x45, 0xdf, 0xa3])) {
    return "video/webm";
  }

  // ISO base media: a `ftyp` box at offset 4, whose brand distinguishes AVIF
  // (an image) from MP4 and QuickTime (videos).
  if (matchesAscii(header, 4, "ftyp")) {
    const brand = header.subarray(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis") {
      return "image/avif";
    }
    if (brand === "qt  ") {
      return "video/quicktime";
    }
    return "video/mp4";
  }

  return null;
}

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) {
    return false;
  }
  return bytes.every((byte, index) => buffer[index] === byte);
}

function matchesAscii(buffer: Buffer, offset: number, value: string): boolean {
  if (buffer.length < offset + value.length) {
    return false;
  }
  return (
    buffer.subarray(offset, offset + value.length).toString("ascii") === value
  );
}
