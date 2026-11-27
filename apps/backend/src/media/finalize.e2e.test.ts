import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaVersion } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

type StoredObject = { bytes: Buffer; checksum?: string };

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

function put(key: string, bytes: Buffer, withChecksum = true): void {
  const checksum = withChecksum
    ? createHash("sha256").update(bytes).digest("base64")
    : null;
  objects.set(key, {
    bytes,
    ...(checksum ? { checksum } : {}),
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
          ...(object.checksum ? { ChecksumSHA256: object.checksum } : {}),
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
  it("finalizes bytes whose SHA-256 matches the key", async () => {
    const bytes = await png(8, 8);
    const { media, version, key } = await pendingVersion(bytes);
    put(key, bytes);

    await expect(finalizeMedia(version, media)).resolves.toMatchObject({
      uploadedAt: expect.any(Date),
    });
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
    put(key, other);

    await expect(finalizeMedia(version, media)).rejects.toThrow(/SHA-256/);
    expect(objects.has(key)).toBe(false);
    await expect(
      MediaVersion.query().findById(version.id),
    ).resolves.toMatchObject({
      uploadedAt: null,
    });
  });

  it("verifies an older object that has no stored checksum", async () => {
    const bytes = await png(8, 8);
    const { media, version, key } = await pendingVersion(bytes);
    put(key, bytes, false);

    await expect(finalizeMedia(version, media)).resolves.toMatchObject({
      uploadedAt: expect.any(Date),
    });
  });

  it("rejects older bytes that do not match the key either", async () => {
    const declared = await png(8, 8);
    const other = await png(16, 16);
    const { media, version, key } = await pendingVersion(declared);
    put(key, other, false);

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
