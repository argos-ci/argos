import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaVersion } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

type StoredObject = { bytes: Buffer; checksum: string | null };

const objects = vi.hoisted(() => new Map<string, StoredObject>());
const send = vi.hoisted(() => vi.fn());

vi.mock("@/storage/s3", () => ({ getS3Client: () => ({ send }) }));

const { finalizeMedia } = await import("./finalize");

async function png(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .png()
    .toBuffer();
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function base64(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("base64");
}

/** `undefined` computes the checksum, `null` stores an object without one. */
function put(key: string, bytes: Buffer, checksum?: string | null): void {
  objects.set(key, {
    bytes,
    checksum: checksum === undefined ? base64(bytes) : checksum,
  });
}

async function pendingVersion(bytes: Buffer) {
  const hash = sha256(bytes);
  const { media, version } = await factory.createMediaWithVersion({
    version: { uploadedAt: null, billedUnits: 0 },
  });
  const key = `media/${media.projectId}/${hash}.png`;
  await version.$query().patch({ key });
  version.key = key;
  return { media, version, key };
}

/** Commands that read the whole object, which only the hash fallback does. */
function fullReads(): number {
  return send.mock.calls.filter((call) => {
    const command = call[0] as {
      constructor: { name: string };
      input: { Range?: string };
    };
    return (
      command.constructor.name === "GetObjectCommand" && !command.input.Range
    );
  }).length;
}

beforeEach(async () => {
  await setupDatabase();
  objects.clear();
  send.mockReset();
  send.mockImplementation(
    async (command: {
      constructor: { name: string };
      input: {
        Key?: string;
        Range?: string;
        ChecksumMode?: string;
        Delete?: { Objects: { Key: string }[] };
      };
    }) => {
      if (command.constructor.name === "HeadObjectCommand") {
        const object = objects.get(command.input.Key ?? "");
        if (!object) {
          throw Object.assign(new Error("Not found"), { name: "NotFound" });
        }
        return {
          ContentLength: object.bytes.length,
          ContentType: "image/png",
          // S3 only returns checksums when the caller asks for them.
          ...(command.input.ChecksumMode === "ENABLED" && object.checksum
            ? { ChecksumSHA256: object.checksum }
            : {}),
        };
      }
      if (command.constructor.name === "GetObjectCommand") {
        const object = objects.get(command.input.Key ?? "");
        const range = command.input.Range;
        const bytes = range
          ? object?.bytes.subarray(
              0,
              Number(range.slice("bytes=0-".length)) + 1,
            )
          : object?.bytes;
        return { Body: Readable.from([bytes ?? Buffer.alloc(0)]) };
      }
      if (command.constructor.name === "DeleteObjectsCommand") {
        for (const { Key } of command.input.Delete?.Objects ?? []) {
          objects.delete(Key);
        }
        return {};
      }
      throw new Error(`Unexpected command ${command.constructor.name}`);
    },
  );
});

describe("finalizeMedia SHA-256 integrity", () => {
  it("asks S3 for the stored checksum in HEAD", async () => {
    const bytes = await png(8, 8);
    const { media, version, key } = await pendingVersion(bytes);
    put(key, bytes);

    await finalizeMedia(version, media);

    const head = send.mock.calls.find(
      (call) =>
        (call[0] as { constructor: { name: string } }).constructor.name ===
        "HeadObjectCommand",
    );
    expect(head?.[0]).toMatchObject({
      input: { Key: key, ChecksumMode: "ENABLED" },
    });
  });

  it("finalizes bytes whose SHA-256 matches the key without re-hashing", async () => {
    const bytes = await png(8, 8);
    const { media, version, key } = await pendingVersion(bytes);
    put(key, bytes);

    await expect(finalizeMedia(version, media)).resolves.toMatchObject({
      uploadedAt: expect.any(Date),
    });
    expect(fullReads()).toBe(0);
    await expect(
      MediaVersion.query().findById(version.id),
    ).resolves.toMatchObject({
      uploadedAt: expect.any(Date),
      width: 8,
      height: 8,
    });
  });

  it("rejects valid but different bytes and deletes the bad object", async () => {
    const declared = await png(8, 8);
    const other = await png(16, 16);
    const { media, version, key } = await pendingVersion(declared);
    // Image B landed under image A's key. S3 stores B's checksum with it, so
    // the mismatch has to be caught before the version is finalized.
    put(key, other, base64(other));

    await expect(finalizeMedia(version, media)).rejects.toThrow(/SHA-256/);
    expect(objects.has(key)).toBe(false);
    await expect(
      MediaVersion.query().findById(version.id),
    ).resolves.toMatchObject({
      uploadedAt: null,
    });
  });

  it("verifies an older object that has no stored checksum by streaming it", async () => {
    const bytes = await png(8, 8);
    const { media, version, key } = await pendingVersion(bytes);
    put(key, bytes, null);

    await expect(finalizeMedia(version, media)).resolves.toMatchObject({
      uploadedAt: expect.any(Date),
    });
    expect(fullReads()).toBe(1);
  });

  it("rejects older bytes that do not match the key either", async () => {
    const declared = await png(8, 8);
    const other = await png(16, 16);
    const { media, version, key } = await pendingVersion(declared);
    put(key, other, null);

    await expect(finalizeMedia(version, media)).rejects.toThrow(/SHA-256/);
    expect(objects.has(key)).toBe(false);
  });

  it("still rejects malformed files with matching checksums", async () => {
    const bytes = Buffer.from("<!DOCTYPE html><html><script>alert(1)</script>");
    const { media, version, key } = await pendingVersion(bytes);
    put(key, bytes);

    await expect(finalizeMedia(version, media)).rejects.toThrow(
      /not the declared image\/png/,
    );
    expect(objects.has(key)).toBe(false);
  });

  it("is a no-op once the version has landed", async () => {
    const bytes = await png(8, 8);
    const { media, version, key } = await pendingVersion(bytes);
    put(key, bytes);
    const finalized = await finalizeMedia(version, media);

    await expect(finalizeMedia(finalized, media)).resolves.toBe(finalized);
  });
});
