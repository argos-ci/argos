import { beforeEach, describe, expect, it, vi } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

const deleteObjects = vi.hoisted(() => vi.fn());

vi.mock("@/storage/s3", () => ({
  getS3Client: () => ({ send: deleteObjects }),
}));

const { deleteUnreferencedMediaObjects } = await import("./object");

/**
 * Media keys are content-addressed and namespaced per project, so the same
 * project receiving the same file twice produces two rows pointing at one object.
 * Every path that removes bytes — delete, a rejected upload, retention purge —
 * has to keep an object another row still serves. Nothing else would notice if it
 * didn't: the surviving row looks fine, its bytes are simply gone.
 */
describe("deleteUnreferencedMediaObjects", () => {
  beforeEach(async () => {
    await setupDatabase();
    deleteObjects.mockClear();
  });

  /** The keys the last delete call was asked to remove. */
  function deletedKeys(): string[] {
    const call = deleteObjects.mock.calls[0]?.[0];
    if (!call) {
      return [];
    }
    return call.input.Delete.Objects.map((o: { Key: string }) => o.Key);
  }

  it("deletes a key nothing else references", async () => {
    const version = await factory.MediaVersion.create({
      key: "media/1/only.png",
    });

    await deleteUnreferencedMediaObjects({
      keys: [version.key],
      excludeVersionIds: [version.id],
    });

    expect(deletedKeys()).toEqual(["media/1/only.png"]);
  });

  it("keeps a key another version still serves", async () => {
    // Versions make a shared key routine rather than a corner case: reverting a
    // screenshot to what it was two uploads ago produces a new version pointing
    // at an object that is already stored.
    const media = await factory.Media.create();
    const going = await factory.MediaVersion.create({
      mediaId: media.id,
      number: 1,
      key: "media/1/shared.png",
    });
    await factory.MediaVersion.create({
      mediaId: media.id,
      number: 2,
      key: "media/1/shared.png",
    });

    await deleteUnreferencedMediaObjects({
      keys: [going.key],
      excludeVersionIds: [going.id],
    });

    expect(deleteObjects).not.toHaveBeenCalled();
  });

  it("deletes the unreferenced keys of a mixed batch and keeps the rest", async () => {
    const media = await factory.Media.create();
    const a = await factory.MediaVersion.create({
      mediaId: media.id,
      number: 1,
      key: "media/1/free.png",
    });
    const b = await factory.MediaVersion.create({
      mediaId: media.id,
      number: 2,
      key: "media/1/held.png",
    });
    await factory.MediaVersion.create({
      mediaId: media.id,
      number: 3,
      key: "media/1/held.png",
    });

    await deleteUnreferencedMediaObjects({
      keys: [a.key, b.key],
      excludeVersionIds: [a.id, b.id],
    });

    expect(deletedKeys()).toEqual(["media/1/free.png"]);
  });

  it("counts the row being deleted as gone, not as a reference", async () => {
    // Without the exclusion the row's own key would look referenced and nothing
    // would ever be deleted.
    const version = await factory.MediaVersion.create({
      key: "media/1/self.png",
    });

    await deleteUnreferencedMediaObjects({
      keys: [version.key],
      excludeVersionIds: [version.id],
    });

    expect(deletedKeys()).toEqual(["media/1/self.png"]);
  });

  it("does nothing when given no keys", async () => {
    await deleteUnreferencedMediaObjects({
      keys: [null, undefined, ""],
      excludeVersionIds: [],
    });
    expect(deleteObjects).not.toHaveBeenCalled();
  });
});
