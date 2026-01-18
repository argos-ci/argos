import { createReadStream } from "node:fs";
import { join } from "node:path";
import {
  it as base,
  beforeEach,
  describe,
  expect,
  vi,
  type Mock,
} from "vitest";

import {
  File,
  IgnoredChange,
  IgnoredFile,
  ScreenshotDiff,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import type { S3Client } from "@/storage";

import { processFileFingerprint } from "./process";

const it = base.extend<{
  s3Client: S3Client & { send: Mock<S3Client["send"]> };
}>({
  s3Client: async ({}, use) => {
    await use({
      send: vi.fn(async () => {
        const filePath = join(
          __dirname,
          "../screenshot-diff/__fixtures__/diff-A1.png",
        );
        return {
          ContentType: "image/png",
          Body: createReadStream(filePath),
        };
      }),
    } as unknown as S3Client & { send: Mock<S3Client["send"]> });
  },
});

describe("processFileFingerprint", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("updates fingerprints and creates ignored changes", async ({
    s3Client,
  }) => {
    const file = await factory.File.create({
      type: "screenshotDiff",
      fingerprint: null,
    });
    const screenshotDiff = await factory.ScreenshotDiff.create({
      fileId: file.id,
    });
    const test = await factory.Test.create();
    await IgnoredFile.query().insert({
      projectId: test.projectId,
      testId: test.id,
      fileId: file.id,
    });

    await processFileFingerprint(file, {
      s3: s3Client,
      bucket: "test-bucket",
    });

    expect(s3Client.send).toBeCalled();

    const updatedFile = await File.query().findById(file.id);
    const updatedDiff = await ScreenshotDiff.query().findById(
      screenshotDiff.id,
    );
    expect(updatedFile?.fingerprint).toBe(
      "v1:g16:d1:t0.002,0.02,0.08:202566ca9533046b",
    );
    expect(updatedDiff?.fingerprint).toBe(
      "v1:g16:d1:t0.002,0.02,0.08:202566ca9533046b",
    );

    const ignoredChange = await IgnoredChange.query().findOne({
      projectId: test.projectId,
      testId: test.id,
      fingerprint: "v1:g16:d1:t0.002,0.02,0.08:202566ca9533046b",
    });
    expect(ignoredChange).toBeTruthy();
  });

  it("skips when fingerprint already exists", async ({ s3Client }) => {
    const file = await factory.File.create({
      type: "screenshotDiff",
      fingerprint: "already-set",
    });
    await factory.ScreenshotDiff.create({ fileId: file.id });

    await processFileFingerprint(file, {
      s3: s3Client,
      bucket: "test-bucket",
    });

    expect(s3Client.send).not.toBeCalled();
  });
});
