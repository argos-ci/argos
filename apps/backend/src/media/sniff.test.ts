import { describe, expect, it } from "vitest";

import { detectContentType } from "./sniff";

/** Build a header buffer from a byte list, padded out to the read length. */
function header(...bytes: number[]): Buffer {
  const buffer = Buffer.alloc(64);
  Buffer.from(bytes).copy(buffer);
  return buffer;
}

/** Build an ISO base media header with the given `ftyp` brand. */
function isoBmff(brand: string): Buffer {
  const buffer = Buffer.alloc(64);
  buffer.writeUInt32BE(0x20, 0); // box size, unused by the detector
  buffer.write("ftyp", 4, "ascii");
  buffer.write(brand, 8, "ascii");
  return buffer;
}

describe("detectContentType", () => {
  it("detects PNG", () => {
    expect(
      detectContentType(header(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toBe("image/png");
  });

  it("detects JPEG", () => {
    expect(detectContentType(header(0xff, 0xd8, 0xff, 0xe0))).toBe(
      "image/jpeg",
    );
  });

  it("detects both GIF versions", () => {
    expect(detectContentType(Buffer.from("GIF87a padding"))).toBe("image/gif");
    expect(detectContentType(Buffer.from("GIF89a padding"))).toBe("image/gif");
  });

  it("detects WebP, which needs the brand at offset 8 and not just the RIFF magic", () => {
    const webp = Buffer.alloc(64);
    webp.write("RIFF", 0, "ascii");
    webp.write("WEBP", 8, "ascii");
    expect(detectContentType(webp)).toBe("image/webp");

    // A WAV file is also RIFF. Without the brand check it would pass as an image.
    const wav = Buffer.alloc(64);
    wav.write("RIFF", 0, "ascii");
    wav.write("WAVE", 8, "ascii");
    expect(detectContentType(wav)).toBeNull();
  });

  it("detects WebM", () => {
    expect(detectContentType(header(0x1a, 0x45, 0xdf, 0xa3))).toBe(
      "video/webm",
    );
  });

  it("tells AVIF, MP4 and QuickTime apart by their ftyp brand", () => {
    expect(detectContentType(isoBmff("avif"))).toBe("image/avif");
    expect(detectContentType(isoBmff("avis"))).toBe("image/avif");
    expect(detectContentType(isoBmff("qt  "))).toBe("video/quicktime");
    expect(detectContentType(isoBmff("isom"))).toBe("video/mp4");
    expect(detectContentType(isoBmff("mp42"))).toBe("video/mp4");
  });

  it("rejects HTML declared as an image, which is the case this exists for", () => {
    expect(detectContentType(Buffer.from("<!DOCTYPE html><html>"))).toBeNull();
    expect(detectContentType(Buffer.from("<svg xmlns="))).toBeNull();
  });

  it("rejects a buffer too short to identify", () => {
    expect(detectContentType(Buffer.from([0x89, 0x50]))).toBeNull();
    expect(detectContentType(Buffer.alloc(0))).toBeNull();
  });
});
