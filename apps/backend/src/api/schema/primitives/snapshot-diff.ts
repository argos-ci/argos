import { ScreenshotMetadataSchema } from "@argos/schemas/screenshot-metadata";
import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import {
  Screenshot,
  ScreenshotDiff,
  type File as FileModel,
} from "@/database/models";
import { getPublicImageFileUrl, getPublicUrl, getTwicPicsUrl } from "@/storage";

const SnapshotDiffStatusSchema = z
  .enum([
    "pending",
    "removed",
    "failure",
    "added",
    "changed",
    "unchanged",
    "retryFailure",
    "ignored",
  ])
  .meta({
    description: "Status of the snapshot diff",
  });

const Snapshot = z
  .object({
    id: z.string().meta({
      description: "Unique identifier of the snapshot",
    }),
    name: z.string().meta({
      description: "Name of the snapshot",
    }),
    metadata: ScreenshotMetadataSchema.nullable(),
    width: z.number().nullable().meta({
      description: "Width of the screenshot in pixels",
    }),
    height: z.number().nullable().meta({
      description: "Height of the screenshot in pixels",
    }),
    url: z.url().meta({
      description: "Public URL of the snapshot",
    }),
    originalUrl: z.url().meta({
      description: "Public URL of the original snapshot file",
    }),
    contentType: z.string().meta({
      description: "Content type of the snapshot file",
    }),
  })
  .meta({
    description: "Snapshot associated to a diff",
  });

export const SnapshotDiffSchema = z
  .object({
    id: z.string().meta({
      description: "Unique identifier of the snapshot diff",
    }),
    name: z.string().meta({
      description: "Name of the snapshot diff",
    }),
    status: SnapshotDiffStatusSchema,
    score: z.number().nullable().meta({
      description: "Similarity score between snapshots",
    }),
    group: z.string().nullable().meta({
      description: "Grouping key for the snapshot diff",
    }),
    parentName: z.string().nullable().meta({
      description: "Parent name of the snapshot (usually the story id)",
    }),
    url: z.url().nullable().meta({
      description: "URL of the diff image",
    }),
    base: Snapshot.nullable(),
    head: Snapshot.nullable(),
  })
  .meta({
    description: "Snapshot diff",
    id: "SnapshotDiff",
  });

type SerializedScreenshot = z.infer<typeof Snapshot>;

async function serializeSnapshot(
  screenshot: Screenshot | null | undefined,
): Promise<SerializedScreenshot | null> {
  if (!screenshot) {
    return null;
  }

  const file = screenshot.file as FileModel | null | undefined;
  const [imageUrl, originalUrl] = await Promise.all([
    file ? getPublicImageFileUrl(file) : getPublicUrl(screenshot.s3Id),
    file ? getPublicUrl(file.key) : getPublicUrl(screenshot.s3Id),
  ]);

  return {
    id: screenshot.id,
    name: screenshot.name,
    metadata: screenshot.metadata,
    width: file?.width ?? null,
    height: file?.height ?? null,
    url: imageUrl,
    originalUrl,
    contentType: file?.contentType ?? "image/png",
  };
}

async function getSnapshotDiffUrl(diff: ScreenshotDiff) {
  const file = diff.file as FileModel | null | undefined;
  if (file) {
    return getPublicImageFileUrl(file);
  }
  if (diff.s3Id) {
    return getTwicPicsUrl(diff.s3Id);
  }
  return null;
}

/**
 * Serialize screenshot diffs for API response.
 */
export async function serializeSnapshotDiffs(
  diffs: ScreenshotDiff[],
): Promise<z.infer<typeof SnapshotDiffSchema>[]> {
  const screenshotById = new Map<string, Screenshot>();
  diffs.forEach((diff) => {
    if (diff.baseScreenshot) {
      screenshotById.set(diff.baseScreenshot.id, diff.baseScreenshot);
    }
    if (diff.compareScreenshot) {
      screenshotById.set(diff.compareScreenshot.id, diff.compareScreenshot);
    }
  });

  return Promise.all(
    diffs.map(async (diff) => {
      const [status, base, head, url] = await Promise.all([
        diff.$getDiffStatus(),
        serializeSnapshot(diff.baseScreenshot),
        serializeSnapshot(diff.compareScreenshot),
        getSnapshotDiffUrl(diff),
      ]);
      const name = base?.name ?? head?.name;
      invariant(name, "Screenshot diff without name");
      const parentName =
        diff.compareScreenshot?.parentName ??
        diff.baseScreenshot?.parentName ??
        null;

      return {
        id: diff.id,
        name,
        status,
        score: diff.score,
        group: diff.group,
        parentName,
        url,
        base,
        head,
      };
    }),
  );
}
