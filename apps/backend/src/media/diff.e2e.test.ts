import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

import config from "@/config";
import { MediaDiff } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { checkIfExists, getS3Client, uploadFromFilePath } from "@/storage";

import { computeMediaDiff } from "./diff";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** Reused from the screenshot diff's fixtures: the same engine, the same images. */
const FIXTURES = join(__dirname, "..", "screenshot-diff", "__fixtures__");

const BEFORE_KEY = "media/test/penelope-before.png";
const AFTER_KEY = "media/test/penelope-after.png";

// Real images, decoded, compared and round-tripped through storage, so the wall
// time tracks how loaded the machine is. The budget is here to catch a hang, not
// to police a few hundred milliseconds.
const TIMEOUT = 30_000;

/**
 * The comparison itself, end to end: two objects in the bucket in, a mask in the
 * bucket and a finished row out.
 *
 * Worth exercising against real storage rather than mocks. Every interesting
 * failure here is in the round trip — a key that does not resolve, an image that
 * cannot be decoded, a mask nobody uploaded — and none of those show up against
 * a stub.
 */
describe("computeMediaDiff", () => {
  const context = {
    get s3() {
      return getS3Client();
    },
    bucket: config.get("s3.screenshotsBucket"),
  };

  beforeAll(async () => {
    const s3 = getS3Client();
    await Promise.all([
      uploadFromFilePath({
        s3,
        Bucket: config.get("s3.screenshotsBucket"),
        Key: BEFORE_KEY,
        inputPath: join(FIXTURES, "penelope.png"),
      }),
      uploadFromFilePath({
        s3,
        Bucket: config.get("s3.screenshotsBucket"),
        Key: AFTER_KEY,
        inputPath: join(FIXTURES, "penelope-argos.png"),
      }),
    ]);
  }, TIMEOUT);

  /** A pair of uploaded versions in one project, pointing at the given keys. */
  async function createPair(keys: { before: string; after: string }) {
    await setupDatabase();
    const project = await factory.Project.create();
    const [before, after] = await Promise.all([
      factory.Media.create({
        projectId: project.id,
        name: "penelope.png",
        state: "before",
      }),
      factory.Media.create({
        projectId: project.id,
        name: "penelope.png",
        state: "after",
      }),
    ]);
    const [beforeVersion, afterVersion] = await Promise.all([
      factory.MediaVersion.create({
        mediaId: before.id,
        number: 1,
        key: keys.before,
      }),
      factory.MediaVersion.create({
        mediaId: after.id,
        number: 1,
        key: keys.after,
      }),
    ]);
    const diff = await MediaDiff.query().insertAndFetch({
      beforeMediaVersionId: beforeVersion.id,
      afterMediaVersionId: afterVersion.id,
      jobStatus: "pending",
    });
    return { project, diff };
  }

  it(
    "stores a mask for a pair that differs",
    async () => {
      const { project, diff } = await createPair({
        before: BEFORE_KEY,
        after: AFTER_KEY,
      });

      await computeMediaDiff(diff, context);

      await diff.reload();
      expect(diff.score).toBeGreaterThan(0);
      expect(diff.width).toBeGreaterThan(0);
      expect(diff.height).toBeGreaterThan(0);
      // Under the project's own prefix, and content-addressed on the mask.
      expect(diff.key).toMatch(
        new RegExp(`^media/${project.id}/diffs/[0-9a-f]{64}\\.png$`),
      );
      // The row pointing at a mask nobody uploaded is the failure this asserts
      // against: the page would render a broken overlay and nothing would report
      // it.
      await expect(
        checkIfExists({
          s3: getS3Client(),
          Bucket: config.get("s3.screenshotsBucket"),
          Key: diff.key!,
        }),
      ).resolves.toBe(true);
    },
    TIMEOUT,
  );

  it(
    "answers identical halves without a mask",
    async () => {
      // Keys are content-addressed, so the same key is the same bytes — no
      // download, no compare, and nothing to draw.
      const { diff } = await createPair({
        before: BEFORE_KEY,
        after: BEFORE_KEY,
      });

      await computeMediaDiff(diff, context);

      await diff.reload();
      expect(diff.score).toBe(0);
      expect(diff.key).toBeNull();
    },
    TIMEOUT,
  );
});
