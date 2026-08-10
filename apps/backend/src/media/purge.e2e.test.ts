import { beforeEach, describe, expect, it, vi } from "vitest";

import { Media, MediaVersion } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

const s3Send = vi.hoisted(() => vi.fn());

vi.mock("@/storage/s3", () => ({
  getS3Client: () => ({ send: s3Send }),
}));

const { purgeExpiredMedia } = await import("./purge");

const PAST = "2026-01-01T00:00:00.000Z";
const FUTURE = "2027-01-01T00:00:00.000Z";
const NOW = new Date("2026-06-01T00:00:00.000Z");

/**
 * Retention has to reach the bytes, not just the rows.
 *
 * A purge that deleted rows alone would look completely healthy — the share URL
 * stops working, the media is gone from every listing — while the objects stay in
 * the bucket forever, paid for and unreferenced. Nothing downstream would ever
 * notice, so the S3 call is asserted here rather than assumed.
 */
describe("purgeExpiredMedia", () => {
  beforeEach(async () => {
    await setupDatabase();
    s3Send.mockClear();
  });

  /** Every key the purge asked storage to delete. */
  function deletedKeys(): string[] {
    return s3Send.mock.calls.flatMap(
      (call) =>
        call[0]?.input?.Delete?.Objects?.map((o: { Key: string }) => o.Key) ??
        [],
    );
  }

  it("deletes the object behind an expired version, not only its row", async () => {
    const { media, version } = await factory.createMediaWithVersion({
      version: { key: "media/1/expired.png", expiresAt: PAST },
    });

    const purged = await purgeExpiredMedia(NOW);

    expect(purged).toBe(1);
    expect(deletedKeys()).toEqual(["media/1/expired.png"]);
    await expect(
      MediaVersion.query().findById(version.id),
    ).resolves.toBeUndefined();
    // Nothing left to serve, so the media goes with its last version.
    await expect(Media.query().findById(media.id)).resolves.toBeUndefined();
  });

  it("keeps a media whose newer version has not expired", async () => {
    // Retention is about stored bytes, so it applies per version: an old upload
    // ages out while the share URL keeps working and shows the newest one.
    const media = await factory.Media.create();
    await factory.MediaVersion.create({
      mediaId: media.id,
      number: 1,
      key: "media/1/old.png",
      expiresAt: PAST,
    });
    await factory.MediaVersion.create({
      mediaId: media.id,
      number: 2,
      key: "media/1/current.png",
      expiresAt: FUTURE,
    });

    await purgeExpiredMedia(NOW);

    expect(deletedKeys()).toEqual(["media/1/old.png"]);
    await expect(Media.query().findById(media.id)).resolves.toBeDefined();
    await expect(
      MediaVersion.query().where("mediaId", media.id),
    ).resolves.toHaveLength(1);
  });

  it("keeps an object a surviving version still points at", async () => {
    // Keys are content-addressed, so reverting a screenshot to what it was two
    // uploads ago produces a new version sharing an older one's key. Deleting the
    // object because one of them expired would silently empty the other.
    const media = await factory.Media.create();
    await factory.MediaVersion.create({
      mediaId: media.id,
      number: 1,
      key: "media/1/shared.png",
      expiresAt: PAST,
    });
    await factory.MediaVersion.create({
      mediaId: media.id,
      number: 2,
      key: "media/1/shared.png",
      expiresAt: FUTURE,
    });

    await purgeExpiredMedia(NOW);

    expect(s3Send).not.toHaveBeenCalled();
    await expect(
      MediaVersion.query().where("mediaId", media.id),
    ).resolves.toHaveLength(1);
  });

  it("purges a version whose upload was never finalized", async () => {
    // `expiresAt` is stamped at creation, not at upload, which is what makes an
    // abandoned two-step upload expire on its own. Without it, bytes pushed to the
    // signed URL by a caller that never finalized would be stored forever with no
    // row claiming them.
    await factory.createMediaWithVersion({
      version: {
        key: "media/1/abandoned.png",
        expiresAt: PAST,
        uploadedAt: null,
        billedUnits: 0,
      },
    });

    await purgeExpiredMedia(NOW);

    expect(deletedKeys()).toEqual(["media/1/abandoned.png"]);
  });

  it("leaves unexpired media alone", async () => {
    await factory.createMediaWithVersion({
      version: { key: "media/1/fresh.png", expiresAt: FUTURE },
    });

    await expect(purgeExpiredMedia(NOW)).resolves.toBe(0);
    expect(s3Send).not.toHaveBeenCalled();
  });
});
