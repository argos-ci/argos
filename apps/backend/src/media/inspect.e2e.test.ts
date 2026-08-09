import { Readable } from "node:stream";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());

vi.mock("@/storage/s3", () => ({
  getS3Client: () => ({ send }),
}));

const { inspectMediaObject, MediaContentMismatchError } =
  await import("./inspect");

/** Answer the next ranged read with these bytes. */
function respondWith(buffer: Buffer) {
  send.mockImplementationOnce(async () => ({
    Body: Readable.from([buffer]),
  }));
}

/**
 * A real EBML header carrying a `DocType`.
 *
 * WebM and Matroska share the EBML magic byte for byte; only the `DocType`
 * element tells them apart, which is why these tests build a real header rather
 * than the four magic bytes.
 */
function ebmlHeader(docType: string): Buffer {
  const type = Buffer.from(docType, "ascii");
  const body = Buffer.concat([
    // EBMLVersion, EBMLReadVersion, EBMLMaxIDLength, EBMLMaxSizeLength
    Buffer.from([
      0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81, 0x04,
      0x42, 0xf3, 0x81, 0x08,
    ]),
    Buffer.from([0x42, 0x82, 0x80 | type.length]),
    type,
    // DocTypeVersion, DocTypeReadVersion
    Buffer.from([0x42, 0x87, 0x81, 0x02, 0x42, 0x85, 0x81, 0x02]),
  ]);
  return Buffer.concat([
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x80 | body.length]),
    body,
  ]);
}

/** An ISO base media header with the given `ftyp` brand. */
function isoBmffHeader(brand: string): Buffer {
  const buffer = Buffer.alloc(64);
  buffer.writeUInt32BE(0x20, 0);
  buffer.write("ftyp", 4, "ascii");
  buffer.write(brand, 8, "ascii");
  return buffer;
}

/**
 * The whole of Argos's server-side handling of an uploaded file: one ranged read
 * that checks the bytes are what they claim and picks up an image's dimensions.
 * Nothing is transcoded or re-encoded, so this is the only thing standing between
 * a caller's declared content type and an unauthenticated CDN URL.
 */
describe("inspectMediaObject", () => {
  beforeEach(() => {
    send.mockReset();
  });

  it("reads an image's dimensions from its header alone", async () => {
    const png = await sharp({
      create: {
        width: 1024,
        height: 768,
        channels: 3,
        background: "#fff",
      },
    })
      .png()
      .toBuffer();
    respondWith(png);

    const result = await inspectMediaObject({
      key: "media/1/a.png",
      declaredContentType: "image/png",
    });

    expect(result).toEqual({ width: 1024, height: 768 });
  });

  it("only reads the first 64 KB, whatever the file size", async () => {
    const png = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "#000" },
    })
      .png()
      .toBuffer();
    respondWith(png);

    await inspectMediaObject({
      key: "media/1/a.png",
      declaredContentType: "image/png",
    });

    const command = send.mock.calls[0]?.[0];
    expect(command.input.Range).toBe(`bytes=0-${64 * 1024 - 1}`);
  });

  it("rejects HTML declared as an image", async () => {
    // The case this exists for: media is served from an unauthenticated CDN URL,
    // so active content passing as a PNG would be hosted on an Argos domain.
    respondWith(Buffer.from("<!DOCTYPE html><html><script>alert(1)</script>"));

    await expect(
      inspectMediaObject({
        key: "media/1/a.png",
        declaredContentType: "image/png",
      }),
    ).rejects.toThrow(MediaContentMismatchError);
  });

  it("rejects a video declared as an image", async () => {
    // Not cosmetic: it would be rendered by the wrong element and billed at the
    // wrong rate (1 unit instead of 25).
    respondWith(ebmlHeader("webm"));

    await expect(
      inspectMediaObject({
        key: "media/1/a.png",
        declaredContentType: "image/png",
      }),
    ).rejects.toThrow(/video\/webm/);
  });

  it("rejects Matroska declared as WebM, which shares its magic bytes", async () => {
    // The two containers are identical at the magic-byte level and only the
    // `DocType` separates them. A browser refuses to play Matroska, so accepting
    // it would store a video that renders as a broken player.
    respondWith(ebmlHeader("matroska"));

    await expect(
      inspectMediaObject({
        key: "media/1/a.webm",
        declaredContentType: "video/webm",
      }),
    ).rejects.toThrow(MediaContentMismatchError);
  });

  it("rejects a RIFF container that is not WebP", async () => {
    // WAV opens with the same `RIFF` magic as WebP; only the form type at offset
    // 8 tells them apart.
    const wav = Buffer.alloc(64);
    wav.write("RIFF", 0, "ascii");
    wav.write("WAVE", 8, "ascii");
    respondWith(wav);

    await expect(
      inspectMediaObject({
        key: "media/1/a.webp",
        declaredContentType: "image/webp",
      }),
    ).rejects.toThrow(MediaContentMismatchError);
  });

  it("tolerates a container mismatch inside the video category", async () => {
    // A `.mov` that is really an MP4 plays either way, so it is accepted; the CDN
    // derives the poster from whatever is actually there.
    respondWith(isoBmffHeader("isom"));

    await expect(
      inspectMediaObject({
        key: "media/1/a.mov",
        declaredContentType: "video/quicktime",
      }),
    ).resolves.toEqual({ width: null, height: null });
  });

  it("tells AVIF, MP4 and QuickTime apart by their ftyp brand", async () => {
    // One container, three `ftyp` brands, and one of them is an image — reading
    // the brand is what keeps an AVIF from being billed as a video.
    respondWith(isoBmffHeader("qt  "));
    await expect(
      inspectMediaObject({
        key: "media/1/a.mov",
        declaredContentType: "video/quicktime",
      }),
    ).resolves.toEqual({ width: null, height: null });

    respondWith(isoBmffHeader("avif"));
    await expect(
      inspectMediaObject({
        key: "media/1/a.mp4",
        declaredContentType: "video/mp4",
      }),
    ).rejects.toThrow(/image\/avif/);
  });

  it("returns no dimensions for a video, which keeps them at the end of the file", async () => {
    respondWith(isoBmffHeader("isom"));

    await expect(
      inspectMediaObject({
        key: "media/1/a.mp4",
        declaredContentType: "video/mp4",
      }),
    ).resolves.toEqual({ width: null, height: null });
  });

  it("rejects bytes too short to identify", async () => {
    respondWith(Buffer.from([0x89, 0x50]));

    await expect(
      inspectMediaObject({
        key: "media/1/a.png",
        declaredContentType: "image/png",
      }),
    ).rejects.toThrow(/unrecognized type/);
  });

  it("accepts an image whose dimensions cannot be read", async () => {
    // Dimensions are a layout nicety; a header sharp can't parse is not a reason
    // to refuse the upload. Valid GIF magic, then nothing usable.
    respondWith(Buffer.from("GIF89a"));

    await expect(
      inspectMediaObject({
        key: "media/1/a.gif",
        declaredContentType: "image/gif",
      }),
    ).resolves.toEqual({ width: null, height: null });
  });
});
