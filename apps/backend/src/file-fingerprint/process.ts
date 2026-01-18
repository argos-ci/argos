import { fingerprintDiff } from "@argos-ci/mask-fingerprint";

import { transaction } from "@/database";
import {
  File,
  IgnoredChange,
  IgnoredFile,
  ScreenshotDiff,
} from "@/database/models";
import { S3FileHandle, type S3Client } from "@/storage";

/**
 * If the file has no fingerprint:
 * - Add one to the file
 * - Add one to all linked screenshot diffs
 * - Copy from ignored_files to ignored_changes
 */
export async function processFileFingerprint(
  file: File,
  context: {
    s3: S3Client;
    bucket: string;
  },
) {
  if (file.fingerprint) {
    return;
  }

  const handle = new S3FileHandle({
    ...context,
    key: file.key,
    contentType: file?.contentType ?? "image/png",
  });

  const filepath = await handle.getFilepath();
  const [fingerprint, ignoredFiles] = await Promise.all([
    fingerprintDiff(filepath),
    IgnoredFile.query().where("fileId", file.id),
  ]);

  await transaction(async (trx) => {
    await Promise.all([
      ScreenshotDiff.query(trx).where("fileId", file.id).patch({ fingerprint }),
      File.query(trx).findById(file.id).patch({ fingerprint }),
    ]);

    if (ignoredFiles.length > 0) {
      await IgnoredChange.query(trx).insert(
        ignoredFiles.map((ignoredFile) => ({
          projectId: ignoredFile.projectId,
          testId: ignoredFile.testId,
          fingerprint,
        })),
      );
    }
  });
}
