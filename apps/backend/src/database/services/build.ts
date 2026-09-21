import type { BuildAggregatedStatus } from "@argos/schemas/build-status";
import type { BuildType } from "@argos/schemas/build-type";

import { knex } from "@/database";
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
 * A `search` filter turned into predicates Postgres can serve from an index,
 * by {@link resolveBuildsFilters}.
 *
 * The search is a disjunction — a build matches on its name, on its branch or
 * on its commit — and Postgres can only index a disjunction when *every* arm
 * of it is indexable. A single `ILIKE '%…%'`, or a single arm it has to
 * evaluate as a subplan, drops the whole thing to a filter and makes it read
 * every build of the project. So the two set-valued arms are resolved to the
 * values they actually stand for, which turns them into equality lookups and
 * lets the arms that match nothing disappear entirely.
 */
type ResolvedBuildsSearch = {
  /** The escaped `%…%` pattern, for the arms that fall back to `ILIKE`. */
  pattern: string;
  /** The searched commit, when the input looks like a SHA. */
  sha: string | null;
  /**
   * The build names of the projects matching the pattern, or `null` when a
   * project has more distinct names than {@link SEARCH_NAMES_LIMIT}.
   */
  names: string[] | null;
  /**
   * The ids of the compare buckets matching the pattern, or `null` when they
   * are past {@link SEARCH_BUCKETS_LIMIT}.
   */
  bucketIds: string[] | null;
};

export type ResolvedBuildsFilters = Omit<BuildsFilters, "search"> & {
  search?: ResolvedBuildsSearch | null | undefined;
};

/**
 * How many distinct build names a project may have before the name arm of a
 * search gives up and matches with `ILIKE` instead.
 *
 * A project has a handful — one per test suite — so a project past this is
 * not one the resolution below was meant for.
 */
const SEARCH_NAMES_LIMIT = 200;

/**
 * How many compare buckets a search may match before their ids stop being
 * inlined in the build query and a subquery is used instead.
 *
 * Past it the search matches a large share of the project, so the disjunction
 * no longer needs to be indexable: whatever the caller is after, it finds it
 * in the first rows it reads.
 */
const SEARCH_BUCKETS_LIMIT = 1000;

/**
 * Resolve the filters {@link queryBuilds} cannot turn into an indexable
 * predicate on its own. Only `search` needs it; anything else is passed
 * through untouched.
 */
export async function resolveBuildsFilters(input: {
  projectId: string | string[];
  filters?: BuildsFilters | null;
}): Promise<ResolvedBuildsFilters | null> {
  const { filters } = input;
  if (!filters) {
    return null;
  }

  const search = filters.search?.trim();
  if (!search) {
    return { ...filters, search: null };
  }

  const projectIds = toProjectIds(input.projectId);
  // If the search looks like a commit SHA, also match commits by prefix.
  const sha = /^[0-9a-f]{7,40}$/i.test(search) ? search.toLowerCase() : null;
  const pattern = `%${escapeLikePattern(search)}%`;
  const [names, bucketIds] = await Promise.all([
    findMatchingBuildNames({ projectIds, pattern }),
    findMatchingBucketIds({ projectIds, pattern, sha }),
  ]);

  return { ...filters, search: { pattern, sha, names, bucketIds } };
}

/**
 * The build names of `projectIds` matching `pattern`, or `null` when one of
 * the projects has more distinct names than {@link SEARCH_NAMES_LIMIT}.
 *
 * The recursive CTE is a loose index scan over
 * `builds_projectid_name_createdat_idx`: one descent per distinct name,
 * instead of reading the project's builds to collect them.
 */
async function findMatchingBuildNames(input: {
  projectIds: string[];
  pattern: string;
}): Promise<string[] | null> {
  const perProject = await Promise.all(
    input.projectIds.map(async (projectId) => {
      const result = await knex.raw<{
        rows: { name: string; matched: boolean }[];
      }>(
        `with recursive "distinct_names" as (
            (select "name" from "builds" where "projectId" = :projectId order by "name" limit 1)
            union all
            select (
              select "b"."name" from "builds" as "b"
              where "b"."projectId" = :projectId and "b"."name" > "distinct_names"."name"
              order by "b"."name" limit 1
            )
            from "distinct_names" where "distinct_names"."name" is not null
          )
          select "name", "name" ilike :pattern as "matched"
          from "distinct_names" where "name" is not null limit :limit`,
        { projectId, pattern: input.pattern, limit: SEARCH_NAMES_LIMIT + 1 },
      );
      return result.rows;
    }),
  );
  if (perProject.some((rows) => rows.length > SEARCH_NAMES_LIMIT)) {
    return null;
  }
  return Array.from(
    new Set(
      perProject.flatMap((rows) =>
        rows.filter((row) => row.matched).map((row) => row.name),
      ),
    ),
  );
}

/**
 * The ids of the compare buckets of `projectIds` matching `pattern`, or `null`
 * when there are more than {@link SEARCH_BUCKETS_LIMIT} of them.
 */
async function findMatchingBucketIds(input: {
  projectIds: string[];
  pattern: string;
  sha: string | null;
}): Promise<string[] | null> {
  const { projectIds, pattern, sha } = input;
  const buckets = await ScreenshotBucket.query()
    .select("id")
    .whereIn("projectId", projectIds)
    .where((qb) => {
      qb.whereILike("branch", pattern);
      if (sha) {
        qb.orWhereLike("commit", `${sha}%`);
      }
    })
    .limit(SEARCH_BUCKETS_LIMIT + 1);
  if (buckets.length > SEARCH_BUCKETS_LIMIT) {
    return null;
  }
  return buckets.map((bucket) => bucket.id);
}

function toProjectIds(projectId: string | string[]): string[] {
  return Array.isArray(projectId) ? projectId : [projectId];
}

/**
 * Build a query matching the builds of a project — or of several, when the
 * caller spans projects, as the sibling builds of a commit do — with optional
 * filters applied. The returned query has no ordering or pagination, callers
 * are expected to apply their own.
 *
 * Branch and commit predicates go through project-scoped subqueries on
 * `screenshot_buckets` instead of a join, so they stay indexable on
 * projects with a large number of builds.
 *
 * A `search` filter has to go through {@link resolveBuildsFilters} first.
 */
export function queryBuilds(input: {
  projectId: string | string[];
  filters?: ResolvedBuildsFilters | null;
}) {
  const { filters } = input;
  const projectIds = Array.isArray(input.projectId)
    ? input.projectId
    : [input.projectId];
  const projectBucketsQuery = () =>
    ScreenshotBucket.query().select("id").whereIn("projectId", projectIds);

  return Build.query()
    .whereIn("builds.projectId", projectIds)
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

      const search = filters?.search;
      if (search) {
        const { names, bucketIds, sha, pattern } = search;
        const hasNameArm = names === null || names.length > 0;
        const hasBucketArm = bucketIds === null || bucketIds.length > 0;
        // A subquery inside an `OR` is what made this filter read every build
        // of the project: Postgres cannot turn it into a semi-join there, so
        // it hashes every bucket the pattern matches — or, in a parallel plan,
        // re-runs it per row — before it looks at a single build. On its own
        // the subquery does flatten, so how the bucket arm is written depends
        // on what it sits next to.
        const isBucketArmAlone = hasBucketArm && !hasNameArm && !sha;

        if (!hasNameArm && !hasBucketArm && !sha) {
          // Nothing in the project matches: say so, rather than go looking.
          query.whereRaw("false");
        } else {
          query.where((qb) => {
            if (names === null) {
              qb.orWhereILike("builds.name", pattern);
            } else if (names.length > 0) {
              qb.orWhereIn("builds.name", names);
            }

            if (bucketIds !== null) {
              if (bucketIds.length > 0) {
                qb.orWhereIn("builds.compareScreenshotBucketId", bucketIds);
              }
            } else if (isBucketArmAlone) {
              qb.whereIn(
                "builds.compareScreenshotBucketId",
                projectBucketsQuery().where((bucketQb) => {
                  bucketQb.whereILike("branch", pattern);
                  if (sha) {
                    bucketQb.orWhereLike("commit", `${sha}%`);
                  }
                }),
              );
            } else {
              // Too many buckets to list, and something to be OR-ed with:
              // read the bucket per build instead. One primary key lookup a
              // row is nothing next to a pattern this wide — it is matched by
              // so many builds that a page of them is found in the first rows
              // read.
              qb.orWhereRaw(
                `(select ${sha ? `"sb"."branch" ilike ? or "sb"."commit" like ?` : `"sb"."branch" ilike ?`}
                    from "screenshot_buckets" as "sb"
                    where "sb"."id" = "builds"."compareScreenshotBucketId")`,
                sha ? [pattern, `${sha}%`] : [pattern],
              );
            }

            if (sha) {
              qb.orWhereLike("builds.prHeadCommit", `${sha}%`);
            }
          });
        }
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
