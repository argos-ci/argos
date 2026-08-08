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
    const webm = Buffer.alloc(64);
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3]).copy(webm);
    respondWith(webm);

    await expect(
      inspectMediaObject({
        key: "media/1/a.png",
        declaredContentType: "image/png",
      }),
    ).rejects.toThrow(/video\/webm/);
  });

  it("tolerates a container mismatch inside the video category", async () => {
    // A `.mov` that is really an MP4 plays either way, so it is accepted; the CDN
    // derives the poster from whatever is actually there.
    const mp4 = Buffer.alloc(64);
    mp4.write("ftyp", 4, "ascii");
    mp4.write("isom", 8, "ascii");
    respondWith(mp4);

    await expect(
      inspectMediaObject({
        key: "media/1/a.mov",
        declaredContentType: "video/quicktime",
      }),
    ).resolves.toEqual({ width: null, height: null });
  });

  it("returns no dimensions for a video, which keeps them at the end of the file", async () => {
    const mp4 = Buffer.alloc(64);
    mp4.write("ftyp", 4, "ascii");
    mp4.write("isom", 8, "ascii");
    respondWith(mp4);

    await expect(
      inspectMediaObject({
        key: "media/1/a.mp4",
        declaredContentType: "video/mp4",
      }),
    ).resolves.toEqual({ width: null, height: null });
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
