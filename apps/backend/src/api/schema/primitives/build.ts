import { BuildMetadataSchema } from "@argos/schemas/build-metadata";
import { BuildStatsSchema } from "@argos/schemas/build-stats";
import {
  BuildAggregatedStatusSchema,
  BuildConclusionSchema,
  type BuildAggregatedStatus,
} from "@argos/schemas/build-status";
import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import {
  getNotificationPayload,
  NotificationPayloadSchema,
} from "@/build-notification";
import { Build, BuildNotification, ScreenshotBucket } from "@/database/models";

import { PageParamsSchema } from "./pagination";
import { Sha1HashSchema } from "./sha";

export const BuildListParamsSchema = PageParamsSchema.extend({
  head: z.string().min(1).optional(),
  headSha: Sha1HashSchema.optional(),
  distinctName: z
    .string()
    .optional()
    .transform((v) => {
      if (v === "true") {
        return true;
      }
      if (v === "false") {
        return false;
      }
      return null;
    })
    .meta({
      description:
        "Only return the latest builds created, unique by name and commit.",
    }),
});

/**
 * List builds for a project with optional branch, commit, and deduplication
 * filters applied for the API response.
 */
export async function listBuilds(
  ctx: {
    projectId: string;
  },
  params: z.infer<typeof BuildListParamsSchema>,
) {
  const { head, headSha, distinctName, page, perPage } = params;
  const filterQuery = Build.query()
    .select("builds.id")
    .where("builds.projectId", ctx.projectId);

  if (head || headSha) {
    filterQuery.joinRelated("compareScreenshotBucket");
  }

  if (head) {
    filterQuery.where("compareScreenshotBucket.branch", head);
  }

  if (headSha) {
    filterQuery.where((qb) => {
      qb.where("builds.prHeadCommit", headSha).orWhere((subquery) => {
        subquery
          .whereNull("builds.prHeadCommit")
          .where("compareScreenshotBucket.commit", headSha);
      });
    });
  }

  if (distinctName) {
    filterQuery
      .distinctOn("builds.name")
      .orderBy("builds.name")
      .orderBy("builds.id", "desc");
  }

  return Build.query()
    .withGraphFetched(
      "[project.account, compareScreenshotBucket, baseScreenshotBucket]",
    )
    .whereIn("builds.id", filterQuery)
    .orderBy("builds.id", "desc")
    .page(page - 1, perPage);
}

export const BuildIdSchema = z.string().meta({
  description: "A unique identifier for the build",
  example: "12345",
  id: "BuildId",
});

const BuildGitReferenceSchema = z
  .object({
    sha: Sha1HashSchema.meta({
      description: "The commit SHA",
    }),
    branch: z.string().meta({
      description: "The branch name",
    }),
  })
  .meta({
    description: "Git reference",
    id: "BuildGitReference",
  });

export const BuildNumber = z
  .string()
  .transform((value) => z.coerce.number().int().min(1).parse(value))
  .meta({
    description: "The build number",
    example: 42,
    id: "BuildNumber",
  });

export const BuildSchema = z
  .object({
    id: BuildIdSchema,
    number: BuildNumber,
    head: BuildGitReferenceSchema.meta({
      description: "The head reference of the build",
    }),
    base: BuildGitReferenceSchema.nullable().meta({
      description: "The base reference of the build",
    }),
    status: BuildAggregatedStatusSchema.meta({
      description: "The status of the build",
    }),
    conclusion: BuildConclusionSchema.nullable().meta({
      description: "The conclusion of the build",
    }),
    stats: BuildStatsSchema.nullable().meta({
      description: "Stats of the diffs present in the build",
    }),
    metadata: BuildMetadataSchema.nullable(),
    url: z.url().meta({
      description: "The URL of the build",
    }),
    notification: NotificationPayloadSchema.nullable().meta({
      description: "The notification payload for the build",
    }),
  })
  .meta({
    description: "Build",
    id: "Build",
  });

function getBuildNotificationTypeFromBuildStatus(
  buildStatus: BuildAggregatedStatus,
): BuildNotification["type"] | null {
  switch (buildStatus) {
    case "accepted":
      return "diff-accepted";
    case "rejected":
      return "diff-rejected";
    case "changes-detected":
      return "diff-detected";
    case "pending":
      return "queued";
    case "progress":
      return "progress";
    case "no-changes":
      return "no-diff-detected";
    default:
      return null;
  }
}

/**
 * Serialize a list of builds into the public API shape, fetching any missing
 * bucket relations needed to build git references, URLs, and notifications.
 */
export async function serializeBuilds(
  builds: Build[],
): Promise<z.infer<typeof BuildSchema>[]> {
  const missingBucketIds = builds.reduce<string[]>(
    (missingBucketIds, build) => {
      if (
        !build.compareScreenshotBucket &&
        !missingBucketIds.includes(build.compareScreenshotBucketId)
      ) {
        missingBucketIds.push(build.compareScreenshotBucketId);
      }
      if (
        build.baseScreenshotBucketId &&
        !build.baseScreenshotBucket &&
        !missingBucketIds.includes(build.baseScreenshotBucketId)
      ) {
        missingBucketIds.push(build.baseScreenshotBucketId);
      }
      return missingBucketIds;
    },
    [],
  );

  const [missingScreenshotBuckets, statuses, urls] = await Promise.all([
    missingBucketIds.length > 0
      ? ScreenshotBucket.query().whereIn("id", missingBucketIds)
      : [],
    Build.getAggregatedBuildStatuses(builds),
    Promise.all(builds.map(async (build) => build.getUrl())),
  ]);

  const screenshotBucketsById = new Map(
    missingScreenshotBuckets.map((bucket) => [bucket.id, bucket]),
  );

  const notificationPayloads = await Promise.all(
    builds.map((build, i) => {
      const status = statuses[i];
      invariant(status, "Status should be fetched for all builds");
      const buildNotificationType =
        getBuildNotificationTypeFromBuildStatus(status);
      if (!buildNotificationType) {
        return null;
      }
      return getNotificationPayload({
        buildNotification: { type: buildNotificationType },
        build,
      });
    }),
  );

  return builds.map((build, i) => {
    const compareScreenshotBucket =
      build.compareScreenshotBucket ??
      screenshotBucketsById.get(build.compareScreenshotBucketId);
    const baseScreenshotBucket = build.baseScreenshotBucketId
      ? (build.baseScreenshotBucket ??
        screenshotBucketsById.get(build.baseScreenshotBucketId))
      : null;
    invariant(
      compareScreenshotBucket,
      "Compare screenshot bucket should be fetched for all builds",
    );
    const status = statuses[i];
    invariant(status, "Status should be fetched for all builds");
    const url = urls[i];
    invariant(url, "URL should be fetched for all builds");
    const notificationPayload = notificationPayloads[i];
    invariant(
      notificationPayload !== undefined,
      "Notification payload should be fetched for all builds",
    );
    return {
      id: build.id,
      number: build.number,
      head: {
        sha: build.prHeadCommit ?? compareScreenshotBucket.commit,
        branch: compareScreenshotBucket.branch,
      },
      base: baseScreenshotBucket
        ? {
            sha: baseScreenshotBucket.commit,
            branch: baseScreenshotBucket.branch,
          }
        : null,
      metadata: build.metadata,
      stats: build.getStats(),
      status,
      conclusion: build.conclusion,
      url,
      notification: notificationPayload,
    };
  });
}

/**
 * Serialize a single build into the public API shape.
 */
export async function serializeBuild(
  build: Build,
): Promise<z.infer<typeof BuildSchema>> {
  const [response] = await serializeBuilds([build]);
  invariant(response);
  return response;
}
