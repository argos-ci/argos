import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { invariant } from "@argos/util/invariant";
import type { S3Client } from "@aws-sdk/client-s3";
import type { TransactionOrKnex } from "objection";

import { concludeBuild } from "@/build/concludeBuild.js";
import { transaction } from "@/database/index.js";
import {
  Artifact,
  ArtifactDiff,
  File,
  IgnoredFile,
} from "@/database/models/index.js";
import { upsertTestStats } from "@/metrics/test.js";
import { S3ImageFile } from "@/storage/index.js";
import { chunk } from "@/util/chunk.js";
import { redisLock } from "@/util/redis/index.js";

import { DEFAULT_THRESHOLD, diffImages } from "./util/image-diff/index.js";

const hashFile = async (filepath: string): Promise<string> => {
  const fileStream = createReadStream(filepath);
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    fileStream.on("error", reject);
    hash.on("error", reject);
    hash.on("finish", resolve);
    fileStream.pipe(hash);
  });
  return hash.digest("hex");
};

const getOrCreateFile = async (
  values: Pick<File, "width" | "height" | "type" | "key">,
  trx: TransactionOrKnex,
) => {
  const file = await File.query(trx).findOne({ key: values.key });
  if (file) {
    return file;
  }

  return File.query(trx).insert(values).returning("*");
};

/**
 * Ensures that the associated file of the screenshot has dimensions,
 * and if not, it adds them, preparing the files for CDN.
 */
async function ensureFileDimensions({
  s3Image,
  artifact,
}: {
  s3Image: S3ImageFile;
  artifact: Artifact;
}) {
  if (artifact?.file?.width != null && artifact?.file?.height != null) {
    return;
  }

  const dimensions = await s3Image.getDimensions();
  if (artifact.fileId) {
    await File.query().findById(artifact.fileId).patch(dimensions);
    return;
  }

  await transaction(async (trx) => {
    const file = await getOrCreateFile(
      { ...dimensions, type: "screenshot", key: artifact.s3Id },
      trx,
    );
    await Artifact.query(trx).findById(artifact.id).patch({ fileId: file.id });
  });
}

async function lockAndUploadDiffFile(args: {
  key: string;
  width: number;
  height: number;
  image: S3ImageFile;
}) {
  return redisLock.acquire(["diff-upload", args.key], async () => {
    // Check if the diff file has been uploaded by another process
    const existingDiffFile = await File.query().findOne({ key: args.key });
    if (existingDiffFile) {
      return existingDiffFile;
    }

    await args.image.upload();

    return File.query()
      .insert({
        key: args.key,
        width: args.width,
        height: args.height,
        type: "screenshotDiff",
      })
      .returning("*");
  });
}

/**
 * Processes the diff result. Returns the existing file if found.
 * If not, uploads the new diff using a lock to avoid concurrency issues.
 */
async function getOrCreateDiffFile(args: {
  filepath: string;
  width: number;
  height: number;
  s3: S3Client;
  bucket: string;
  key: string;
}) {
  const image = new S3ImageFile({
    s3: args.s3,
    bucket: args.bucket,
    filepath: args.filepath,
    key: args.key,
  });
  let file = await File.query().findOne({ key: args.key });
  if (!file) {
    file = await lockAndUploadDiffFile({
      key: args.key,
      width: args.width,
      height: args.height,
      image,
    });
  }
  await image.unlink();
  return file;
}

/**
 * Computes the screenshot difference
 */
export const computeArtifactDiff = async (
  poorArtifactDiff: ArtifactDiff,
  { s3, bucket }: { s3: S3Client; bucket: string },
) => {
  if (poorArtifactDiff.jobStatus === "complete") {
    return;
  }

  const screenshotDiff = await poorArtifactDiff
    .$query()
    .withGraphFetched("[build, baseArtifact.file, headArtifact.file]");

  const { baseArtifact, headArtifact, build } = screenshotDiff;

  invariant(build, "no build");
  invariant(headArtifact, "no head artifact");

  const baseImage = baseArtifact?.s3Id
    ? new S3ImageFile({
        s3,
        bucket: bucket,
        key: baseArtifact.s3Id,
        dimensions:
          baseArtifact.file?.width != null && baseArtifact.file?.height != null
            ? {
                width: baseArtifact.file.width,
                height: baseArtifact.file.height,
              }
            : null,
      })
    : null;

  const headImage = new S3ImageFile({
    s3,
    bucket: bucket,
    key: headArtifact.s3Id,
    dimensions:
      headArtifact.file?.width != null && headArtifact.file?.height != null
        ? {
            width: headArtifact.file.width,
            height: headArtifact.file.height,
          }
        : null,
  });

  const { buildId } = screenshotDiff;

  // Patching cannot be done in parallel since the file can be the same and must be created only
  if (baseImage && baseArtifact) {
    await ensureFileDimensions({
      artifact: baseArtifact,
      s3Image: baseImage,
    });
  }

  await ensureFileDimensions({
    artifact: headArtifact,
    s3Image: headImage,
  });

  const diffData = await (async () => {
    if (!baseImage) {
      return {};
    }
    if (baseImage.key === headImage.key) {
      return { score: 0 };
    }
    const result = await diffImages(
      baseImage,
      headImage,
      headArtifact.threshold ?? DEFAULT_THRESHOLD,
    );
    if (result === null) {
      return { score: 0 };
    }
    const diffFileKey = await hashFile(result.filepath);
    const diffFile = await getOrCreateDiffFile({
      filepath: result.filepath,
      width: result.width,
      height: result.height,
      s3,
      bucket,
      key: diffFileKey,
    });
    invariant(screenshotDiff.testId, "no testId on screenshotDiff");
    const isIgnored = Boolean(
      await IgnoredFile.query().select("fileId").findOne({
        fileId: diffFile.id,
        projectId: build.projectId,
        testId: screenshotDiff.testId,
      }),
    );
    return {
      s3Id: diffFileKey,
      score: result.score,
      fileId: diffFile.id,
      ignored: isIgnored,
    };
  })();

  await Promise.all([
    // Unlink images
    baseImage?.unlink(),
    headImage.unlink(),
  ]);

  // It is problematic to have to do that to conclude the build
  // we should never have to patch jobStatus to complete while the job is not complete
  // we should probably use another key to check if the diff has been computed.
  await ArtifactDiff.query()
    .findById(screenshotDiff.id)
    .patch({ ...diffData, jobStatus: "complete" });

  await Promise.all([
    // Conclude the build
    concludeBuild({ build }),
    // Group similar diffs
    (async () => {
      if (diffData.s3Id) {
        await redisLock.acquire(["diff-group", diffData.s3Id], async () => {
          await groupSimilarDiffs({ diffFileKey: diffData.s3Id, buildId });
        });
      }
    })(),
    // Insert stats
    (async () => {
      if (screenshotDiff.testId && build.type === "reference") {
        await upsertTestStats({
          testId: screenshotDiff.testId,
          date: new Date(screenshotDiff.createdAt),
          fileId: diffData.fileId ?? null,
        });
      }
    })(),
  ]);
};

/**
 * Group similar diffs by file key.
 */
async function groupSimilarDiffs(input: {
  diffFileKey: string;
  buildId: string;
}) {
  const { diffFileKey, buildId } = input;
  const similarDiffs = await ArtifactDiff.query().where({
    buildId,
    s3Id: diffFileKey,
    group: null,
  });

  // Patch group on screenshot diffs
  if (similarDiffs.length > 1) {
    const diffIds = similarDiffs.map(({ id }) => id);

    const diffIdsChunks = chunk(diffIds, 50);

    for (const diffIdsChunk of diffIdsChunks) {
      // Update diffs
      // We don't do the where in this query because of deadlock issues
      // Having `s3Id` in the where clause causes a deadlock
      await ArtifactDiff.query()
        .whereIn("id", diffIdsChunk)
        .patch({ group: diffFileKey });
    }

    return diffFileKey;
  }

  return null;
}
