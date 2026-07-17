import type { BuildAggregatedStatus } from "@argos/schemas/build-status";
import type { BuildType } from "@argos/schemas/build-type";

import {
  Build,
  BUILD_EXPIRATION_DELAY_MS,
  ScreenshotBucket,
} from "@/database/models";
import { escapeLikePattern } from "@/database/util/like";

export type BuildsFilters = {
  /**
   * Filter by exact build name.
   */
  name?: string | null | undefined;
  /**
   * Filter by build type (builds without a type always match).
   */
  type?: BuildType[] | null | undefined;
  /**
   * Filter by aggregated build status.
   */
  status?: BuildAggregatedStatus[] | null | undefined;
  /**
   * Search in build name, branch (substring) and commit (prefix, when the
   * input looks like a SHA).
   */
  search?: string | null | undefined;
  /**
   * Filter by exact head branch.
   */
  branch?: string | null | undefined;
  /**
   * Filter by exact head commit: matches `prHeadCommit`, or the compare
   * screenshot bucket commit when `prHeadCommit` is not set.
   */
  commit?: string | null | undefined;
};

/**
 * Build a query matching the builds of a project with optional filters
 * applied. The returned query has no ordering or pagination, callers are
 * expected to apply their own.
 *
 * Branch and commit predicates go through project-scoped subqueries on
 * `screenshot_buckets` instead of a join, so they stay indexable on
 * projects with a large number of builds.
 */
export function queryBuilds(input: {
  projectId: string;
  filters?: BuildsFilters | null;
}) {
  const { projectId, filters } = input;
  const projectBucketsQuery = () =>
    ScreenshotBucket.query().select("id").where("projectId", projectId);

  return Build.query()
    .where("builds.projectId", projectId)
    .where((query) => {
      if (filters?.name) {
        query.where("builds.name", filters.name);
      }

      const branch = filters?.branch;
      if (branch) {
        query.whereIn(
          "builds.compareScreenshotBucketId",
          projectBucketsQuery().where("branch", branch),
        );
      }

      const commit = filters?.commit;
      if (commit) {
        query.where((qb) => {
          qb.where("builds.prHeadCommit", commit).orWhere((sub) => {
            sub
              .whereNull("builds.prHeadCommit")
              .whereIn(
                "builds.compareScreenshotBucketId",
                projectBucketsQuery().where("commit", commit),
              );
          });
        });
      }

      const search = filters?.search?.trim();
      if (search) {
        // If the search looks like a commit SHA, also match commits by
        // prefix. Prefix `LIKE` and project-scoped trigram indexes keep
        // each predicate indexable on large projects.
        const sha = /^[0-9a-f]{7,40}$/i.test(search)
          ? search.toLowerCase()
          : null;
        const pattern = `%${escapeLikePattern(search)}%`;
        query.where((qb) => {
          qb.whereILike("builds.name", pattern).orWhereIn(
            "builds.compareScreenshotBucketId",
            projectBucketsQuery().where((bucketQb) => {
              bucketQb.whereILike("branch", pattern);
              if (sha) {
                bucketQb.orWhereLike("commit", `${sha}%`);
              }
            }),
          );
          if (sha) {
            qb.orWhereLike("builds.prHeadCommit", `${sha}%`);
          }
        });
      }

      const type = filters?.type;
      if (type) {
        query.where((qb) => {
          qb.whereIn("builds.type", type).orWhereNull("builds.type");
        });
      }

      const status = filters?.status;
      if (status) {
        query.where((qb) => {
          // Job status check
          if (!status.includes("aborted")) {
            qb.whereNot("jobStatus", "aborted");
          }

          if (!status.includes("error")) {
            qb.whereNot("jobStatus", "error");
          }

          if (!status.includes("expired")) {
            qb.whereNot((qb) => {
              qb.whereIn("jobStatus", ["progress", "pending"]).whereRaw(
                `now() - "builds"."createdAt" > interval '${BUILD_EXPIRATION_DELAY_MS} milliseconds'`,
              );
            });
          }

          if (!status.includes("progress")) {
            qb.whereNot((qb) => {
              qb.where((qb) =>
                // Job is in progress
                // or job is complete without a conclusion, we assume it's in progress
                qb
                  .where("jobStatus", "progress")
                  .orWhere((qb) =>
                    qb.where("jobStatus", "complete").whereNull("conclusion"),
                  ),
              ).whereRaw(
                `now() - "builds"."createdAt" < interval '${BUILD_EXPIRATION_DELAY_MS} milliseconds'`,
              );
            });
          }

          if (!status.includes("pending")) {
            qb.whereNot((qb) => {
              qb.where("jobStatus", "pending").whereRaw(
                `now() - "builds"."createdAt" < interval '${BUILD_EXPIRATION_DELAY_MS} milliseconds'`,
              );
            });
          }

          if (!status.includes("accepted")) {
            qb.whereNotExists(Build.acceptedReviewQuery());
          }

          if (!status.includes("rejected")) {
            qb.whereNotExists(Build.rejectedReviewQuery());
          }

          if (!status.includes("changes-detected")) {
            qb.where((qb) => {
              qb.whereNot("conclusion", "changes-detected")
                .orWhereNull("conclusion")
                .orWhereExists(Build.submittedReviewQuery());
            });
          }

          if (!status.includes("no-changes")) {
            qb.where((qb) => {
              qb.whereNot("conclusion", "no-changes")
                .orWhereNull("conclusion")
                .orWhereExists(Build.submittedReviewQuery());
            });
          }
        });
      }
    });
}
