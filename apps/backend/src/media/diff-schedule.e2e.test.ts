import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaDiff } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

const push = vi.hoisted(() => vi.fn());

vi.mock("./diff-job", () => ({ mediaDiffJob: { push } }));

const { ensureMediaDiff, scheduleMediaDiff } = await import("./diff-schedule");

/**
 * Create the two halves of a pair, both uploaded, in one project.
 *
 * The pairing tuple is (project, attachment, name, state), so the two media only
 * differ by their state — anything else and they are two unrelated media, which
 * several of these tests are about.
 */
async function createPair(attributes?: {
  name?: string;
  before?: { key?: string; mimeType?: string };
  after?: { key?: string; mimeType?: string };
  branch?: string | null;
}) {
  const project = await factory.Project.create();
  const name = attributes?.name ?? "checkout.png";
  const [before, after] = await Promise.all([
    factory.Media.create({
      projectId: project.id,
      name,
      state: "before",
      branch: attributes?.branch ?? null,
    }),
    factory.Media.create({
      projectId: project.id,
      name,
      state: "after",
      branch: attributes?.branch ?? null,
    }),
  ]);
  const [beforeVersion, afterVersion] = await Promise.all([
    factory.MediaVersion.create({
      mediaId: before.id,
      number: 1,
      key: "media/1/before.png",
      ...attributes?.before,
    }),
    factory.MediaVersion.create({
      mediaId: after.id,
      number: 1,
      key: "media/1/after.png",
      ...attributes?.after,
    }),
  ]);
  return { project, before, after, beforeVersion, afterVersion };
}

describe("ensureMediaDiff", () => {
  beforeEach(async () => {
    await setupDatabase();
    push.mockClear();
  });

  it("creates the pair's diff and queues it", async () => {
    const { beforeVersion, afterVersion } = await createPair();

    const diff = await ensureMediaDiff({ beforeVersion, afterVersion });

    expect(diff).toMatchObject({
      beforeMediaVersionId: beforeVersion.id,
      afterMediaVersionId: afterVersion.id,
      jobStatus: "pending",
      score: null,
      key: null,
    });
    expect(push).toHaveBeenCalledExactlyOnceWith(diff?.id);
  });

  it("queues a pair only once", async () => {
    // The share page asks on every load, so a second caller has to find the row
    // rather than insert beside it — and must not re-queue work already done.
    const { beforeVersion, afterVersion } = await createPair();

    const first = await ensureMediaDiff({ beforeVersion, afterVersion });
    const second = await ensureMediaDiff({ beforeVersion, afterVersion });

    expect(second?.id).toBe(first?.id);
    expect(push).toHaveBeenCalledOnce();
    await expect(MediaDiff.query().resultSize()).resolves.toBe(1);
  });

  it("leaves nothing behind when the queue refuses the job", async () => {
    // A row nobody queued would sit `pending` forever and make every later call
    // idempotent against work that is never going to happen.
    push.mockRejectedValueOnce(new Error("queue is down"));
    const { beforeVersion, afterVersion } = await createPair();

    await expect(
      ensureMediaDiff({ beforeVersion, afterVersion }),
    ).resolves.toBeNull();
    await expect(MediaDiff.query().resultSize()).resolves.toBe(0);

    // So the next caller starts over rather than finding a dead row.
    const retried = await ensureMediaDiff({ beforeVersion, afterVersion });
    expect(retried).not.toBeNull();
    expect(push).toHaveBeenCalledTimes(2);
  });

  it("refuses a pair that is not two images", async () => {
    // Argos does not compare videos frame by frame, so there is no mask to
    // compute and nothing to queue.
    const { beforeVersion, afterVersion } = await createPair({
      after: { key: "media/1/after.mp4", mimeType: "video/mp4" },
    });

    await expect(
      ensureMediaDiff({ beforeVersion, afterVersion }),
    ).resolves.toBeNull();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("scheduleMediaDiff", () => {
  beforeEach(async () => {
    await setupDatabase();
    push.mockClear();
  });

  it("pairs a landed upload with the other half's newest version", async () => {
    const { beforeVersion, afterVersion } = await createPair();

    await scheduleMediaDiff(afterVersion);

    await expect(MediaDiff.query()).resolves.toMatchObject([
      {
        beforeMediaVersionId: beforeVersion.id,
        afterMediaVersionId: afterVersion.id,
      },
    ]);
  });

  it("makes a new diff when one half is renewed", async () => {
    // The whole reason a diff is keyed on versions: re-uploading a half is a new
    // pair, so it gets a row of its own rather than overwriting the one a
    // reviewer may be looking at.
    const { after, beforeVersion, afterVersion } = await createPair();
    await scheduleMediaDiff(afterVersion);

    const afterV2 = await factory.MediaVersion.create({
      mediaId: after.id,
      number: 2,
      key: "media/1/after-v2.png",
    });
    await scheduleMediaDiff(afterV2);

    const diffs = await MediaDiff.query().orderBy("id");
    expect(diffs).toMatchObject([
      { afterMediaVersionId: afterVersion.id },
      { afterMediaVersionId: afterV2.id },
    ]);
    expect(
      diffs.every((diff) => diff.beforeMediaVersionId === beforeVersion.id),
    ).toBe(true);
  });

  it("ignores a media that stands alone", async () => {
    const { version } = await factory.createMediaWithVersion();

    await scheduleMediaDiff(version);

    await expect(MediaDiff.query().resultSize()).resolves.toBe(0);
    expect(push).not.toHaveBeenCalled();
  });

  it("ignores a half whose counterpart has not been uploaded yet", async () => {
    // The two halves are two calls, and the first one arrives with nothing to
    // compare against. It is the second that forms the pair.
    const project = await factory.Project.create();
    const [before] = await Promise.all([
      factory.Media.create({
        projectId: project.id,
        name: "checkout.png",
        state: "before",
      }),
      factory.Media.create({
        projectId: project.id,
        name: "checkout.png",
        state: "after",
      }),
    ]);
    const beforeVersion = await factory.MediaVersion.create({
      mediaId: before.id,
      number: 1,
    });

    await scheduleMediaDiff(beforeVersion);

    await expect(MediaDiff.query().resultSize()).resolves.toBe(0);
  });

  it("does not pair halves staged on different branches", async () => {
    // Two branches can both stage a `checkout.png` before. Pairing on the name
    // alone would compare one branch's work against another's.
    const project = await factory.Project.create();
    const before = await factory.Media.create({
      projectId: project.id,
      name: "checkout.png",
      state: "before",
      branch: "feat/a",
    });
    const after = await factory.Media.create({
      projectId: project.id,
      name: "checkout.png",
      state: "after",
      branch: "feat/b",
    });
    await factory.MediaVersion.create({ mediaId: before.id, number: 1 });
    const afterVersion = await factory.MediaVersion.create({
      mediaId: after.id,
      number: 1,
    });

    await scheduleMediaDiff(afterVersion);

    await expect(MediaDiff.query().resultSize()).resolves.toBe(0);
  });

  it("never fails the upload it was called from", async () => {
    // Best-effort by design: the bytes have landed and the caller already has a
    // working share URL, so a queue that is down must not turn a finished upload
    // into a failed one.
    push.mockRejectedValueOnce(new Error("queue is down"));
    const { afterVersion } = await createPair();

    await expect(scheduleMediaDiff(afterVersion)).resolves.toBeUndefined();
  });
});
