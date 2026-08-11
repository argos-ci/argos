import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { knex } from "@/database";
import { MediaDiff } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

// Resolves by default, like the real `push`: the scheduler hands the job over
// without awaiting it and attaches its own rejection handler, so a mock that
// returned `undefined` would not stand in for the queue at all.
const push = vi.hoisted(() => vi.fn(async () => {}));

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

  it("does not wait for the broker", async () => {
    // This runs on the share page's read path, and `push` opens an AMQP channel
    // on first use: with the broker down its retry ladder can hold a caller for
    // minutes. The row has to come back regardless.
    const { beforeVersion, afterVersion } = await createPair();
    let release: () => void = () => {};
    push.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );

    const diff = await ensureMediaDiff({ beforeVersion, afterVersion });

    expect(diff).not.toBeNull();
    expect(push).toHaveBeenCalledOnce();
    release();
  });

  it("queues a pair again once it has gone stale", async () => {
    // A push lost to a broker outage or a worker that died mid-job leaves the row
    // unfinished with nobody working on it. Without this the pair would be
    // permanently uncompared: the row exists, so every later call finds it and
    // queues nothing.
    push.mockRejectedValueOnce(new Error("queue is down"));
    const { beforeVersion, afterVersion } = await createPair();

    const first = await ensureMediaDiff({ beforeVersion, afterVersion });
    invariant(first);

    // Still fresh, so the next caller leaves the job alone rather than racing
    // the worker that may well be running it.
    await ensureMediaDiff({ beforeVersion, afterVersion });
    expect(push).toHaveBeenCalledOnce();

    // Past the window, and `updatedAt` is written outside Objection so the
    // model's own timestamping doesn't undo it.
    await knex("media_diffs")
      .where("id", first.id)
      .update({ updatedAt: new Date(Date.now() - 60 * 60 * 1000) });

    const requeued = await ensureMediaDiff({ beforeVersion, afterVersion });
    expect(requeued?.id).toBe(first.id);
    expect(push).toHaveBeenCalledTimes(2);

    // And the window restarts, so a hot share link cannot re-push on every load.
    await ensureMediaDiff({ beforeVersion, afterVersion });
    expect(push).toHaveBeenCalledTimes(2);
  });

  it("leaves a finished diff alone however old it is", async () => {
    const { beforeVersion, afterVersion } = await createPair();
    const diff = await ensureMediaDiff({ beforeVersion, afterVersion });
    invariant(diff);
    await knex("media_diffs")
      .where("id", diff.id)
      .update({
        jobStatus: "complete",
        updatedAt: new Date(Date.now() - 60 * 60 * 1000),
      });

    await ensureMediaDiff({ beforeVersion, afterVersion });

    expect(push).toHaveBeenCalledOnce();
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
    const { after, beforeVersion, afterVersion } = await createPair();

    await scheduleMediaDiff(afterVersion, after);

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
    await scheduleMediaDiff(afterVersion, after);

    const afterV2 = await factory.MediaVersion.create({
      mediaId: after.id,
      number: 2,
      key: "media/1/after-v2.png",
    });
    await scheduleMediaDiff(afterV2, after);

    const diffs = await MediaDiff.query().orderBy("id");
    expect(diffs).toMatchObject([
      { afterMediaVersionId: afterVersion.id },
      { afterMediaVersionId: afterV2.id },
    ]);
    expect(
      diffs.every((diff) => diff.beforeMediaVersionId === beforeVersion.id),
    ).toBe(true);
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

    await scheduleMediaDiff(beforeVersion, before);

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

    await scheduleMediaDiff(afterVersion, after);

    await expect(MediaDiff.query().resultSize()).resolves.toBe(0);
  });
});
