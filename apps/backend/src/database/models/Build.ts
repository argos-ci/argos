import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { raw, ValidationError } from "objection";
import type {
  Pojo,
  QueryContext,
  RelationMappings,
  TransactionOrKnex,
} from "objection";
import { z } from "zod";

import config from "@/config/index.js";
import { SHA1_REGEX } from "@/web/constants.js";

import {
  BuildMetadata,
  BuildMetadataJsonSchema,
} from "../schemas/BuildMetadata.js";
import { Model } from "../util/model.js";
import {
  jobModelSchema,
  JobStatus,
  timestampsSchema,
} from "../util/schemas.js";
import { BuildReview } from "./BuildReview.js";
import { BuildShard } from "./BuildShard.js";
import { GithubPullRequest } from "./GithubPullRequest.js";
import { Project } from "./Project.js";
import { ScreenshotBucket } from "./ScreenshotBucket.js";
import { ScreenshotDiff } from "./ScreenshotDiff.js";
import { User } from "./User.js";

export const BUILD_EXPIRATION_DELAY_MS = 2 * 3600 * 1000; // 2 hours

export type BuildType = "reference" | "check" | "orphan";

const BuildStatusSchema = z.enum([
  "expired",
  "pending",
  "progress",
  "complete",
  "error",
  "aborted",
]);
type BuildStatus = z.infer<typeof BuildStatusSchema>;

const BuildConclusionSchema = z.enum(["no-changes", "changes-detected"]);
export type BuildConclusion = z.infer<typeof BuildConclusionSchema>;

const BuildReviewStatusSchema = z.enum(["accepted", "rejected"]);
type BuildReviewStatus = z.infer<typeof BuildReviewStatusSchema>;

export const BuildAggregatedStatusSchema = z.union([
  BuildReviewStatusSchema,
  BuildConclusionSchema,
  BuildStatusSchema.exclude(["complete"]),
]);
export type BuildAggregatedStatus = z.infer<typeof BuildAggregatedStatusSchema>;

export type BuildMode = "ci" | "monitoring";

type BuildStats = {
  failure: number;
  added: number;
  unchanged: number;
  changed: number;
  removed: number;
  total: number;
  retryFailure: number;
};

export class Build extends Model {
  static override tableName = "builds";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      jobModelSchema,
      {
        type: "object",
        required: ["compareScreenshotBucketId", "projectId"],
        properties: {
          name: { type: "string", maxLength: 255 },
          baseScreenshotBucketId: { type: ["string", "null"] },
          compareScreenshotBucketId: { type: "string" },
          projectId: { type: "string" },
          number: { type: "integer" },
          externalId: { type: ["string", "null"] },
          batchCount: { type: ["integer", "null"] },
          totalBatch: { type: ["integer", "null"] },
          type: {
            oneOf: [
              { type: "null" },
              { type: "string", enum: ["reference", "check", "orphan"] },
            ],
          },
          prNumber: { type: ["integer", "null"] },
          prHeadCommit: { type: ["string", "null"] },
          githubPullRequestId: { type: ["string", "null"] },
          baseCommit: {
            oneOf: [
              { type: "null" },
              { type: "string", pattern: SHA1_REGEX.source },
            ],
          },
          parentCommits: {
            oneOf: [
              { type: "null" },
              {
                type: "array",
                items: { type: "string", pattern: SHA1_REGEX.source },
              },
            ],
          },
          baseBranch: { type: ["string", "null"] },
          baseBranchResolvedFrom: {
            oneOf: [
              { type: "null" },
              { type: "string", enum: ["user", "pull-request", "project"] },
            ],
          },
          mode: { type: "string", enum: ["ci", "monitoring"] },
          ciProvider: { type: ["string", "null"] },
          argosSdk: { type: ["string", "null"] },
          runId: { type: ["string", "null"] },
          runAttempt: { type: ["integer", "null"] },
          partial: { type: ["boolean", "null"] },
          metadata: {
            oneOf: [BuildMetadataJsonSchema, { type: "null" }],
          },
          conclusion: {
            oneOf: [
              { type: "null" },
              { type: "string", enum: ["no-changes", "changes-detected"] },
            ],
          },
          stats: {
            oneOf: [
              { type: "null" },
              {
                type: "object",
                properties: {
                  failure: { type: "integer" },
                  added: { type: "integer" },
                  unchanged: { type: "integer" },
                  changed: { type: "integer" },
                  removed: { type: "integer" },
                  total: { type: "integer" },
                  retryFailure: { type: "integer" },
                },
                required: [
                  "failure",
                  "added",
                  "unchanged",
                  "changed",
                  "removed",
                  "total",
                  "retryFailure",
                ],
              },
            ],
          },
        },
      },
    ],
  };

  name!: string;
  jobStatus!: JobStatus;
  baseScreenshotBucketId!: string | null;
  compareScreenshotBucketId!: string;
  projectId!: string;
  number!: number;
  externalId!: string | null;
  batchCount!: number | null;
  totalBatch!: number | null;
  type!: BuildType | null;
  prNumber!: number | null;
  prHeadCommit!: string | null;
  githubPullRequestId!: string | null;
  baseCommit!: string | null;
  parentCommits!: string[] | null;
  baseBranch!: string | null;
  baseBranchResolvedFrom!: "user" | "pull-request" | "project" | null;
  mode!: BuildMode;
  ciProvider!: string | null;
  argosSdk!: string | null;
  runId!: string | null;
  runAttempt!: number | null;
  partial!: boolean | null;
  metadata!: BuildMetadata | null;
  conclusion!: BuildConclusion | null;
  stats!: BuildStats | null;

  static override get relationMappings(): RelationMappings {
    return {
      baseScreenshotBucket: {
        relation: Model.BelongsToOneRelation,
        modelClass: ScreenshotBucket,
        join: {
          from: "builds.baseScreenshotBucketId",
          to: "screenshot_buckets.id",
        },
      },
      compareScreenshotBucket: {
        relation: Model.BelongsToOneRelation,
        modelClass: ScreenshotBucket,
        join: {
          from: "builds.compareScreenshotBucketId",
          to: "screenshot_buckets.id",
        },
      },
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: Project,
        join: {
          from: "builds.projectId",
          to: "projects.id",
        },
      },
      screenshotDiffs: {
        relation: Model.HasManyRelation,
        modelClass: ScreenshotDiff,
        join: {
          from: "builds.id",
          to: "screenshot_diffs.buildId",
        },
      },
      pullRequest: {
        relation: Model.BelongsToOneRelation,
        modelClass: GithubPullRequest,
        join: {
          from: "builds.githubPullRequestId",
          to: "github_pull_requests.id",
        },
      },
      shards: {
        relation: Model.HasManyRelation,
        modelClass: BuildShard,
        join: {
          from: "builds.id",
          to: "build_shards.buildId",
        },
      },
    };
  }

  baseScreenshotBucket?: ScreenshotBucket | null;
  compareScreenshotBucket?: ScreenshotBucket;
  project?: Project;
  screenshotDiffs?: ScreenshotDiff[];
  pullRequest?: GithubPullRequest | null;
  shards?: BuildShard[];

  override $afterValidate(json: Pojo) {
    if (
      json["baseScreenshotBucketId"] &&
      json["baseScreenshotBucketId"] === json["compareScreenshotBucketId"]
    ) {
      throw new ValidationError({
        type: "ModelValidation",
        message:
          "The base screenshot bucket should be different to the compare one.",
      });
    }
  }

  override $beforeInsert(queryContext: QueryContext) {
    super.$beforeInsert(queryContext);
    if (this.number === undefined) {
      this.number = -1;
    }
  }

  override $formatDatabaseJson(json: Pojo): Pojo {
    json = super.$formatDatabaseJson(json);
    if (json["number"] === -1) {
      json["number"] = this.$knex().raw(
        '(select coalesce(max(number),0) + 1 as number from builds where "projectId" = ?)',
        this.projectId,
      );
    }
    return json;
  }

  override $afterInsert(queryContext: QueryContext) {
    super.$afterInsert(queryContext);
    return this.reload(queryContext);
  }

  /**
   * Get screenshot diffs statuses for each build.
   */
  static async getScreenshotDiffsStatuses(buildIds: string[]) {
    const screenshotDiffs = buildIds.length
      ? await ScreenshotDiff.query()
          .select("buildId", "jobStatus")
          .whereIn("buildId", buildIds)
          .groupBy("buildId", "jobStatus")
      : [];

    return buildIds.map((buildId) => {
      const diffJobStatuses = screenshotDiffs
        .filter((screenshotDiff) => screenshotDiff.buildId === buildId)
        .map(({ jobStatus }) => jobStatus);

      if (diffJobStatuses.includes("error")) {
        return "error";
      }

      if (
        diffJobStatuses.length === 0 ||
        (diffJobStatuses.length === 1 && diffJobStatuses[0] === "complete")
      ) {
        return "complete";
      }

      return "progress";
    });
  }

  /**
   * Get status of the build.
   * Aggregate statuses from screenshot diffs.
   */
  static async getStatuses(builds: Build[]): Promise<BuildStatus[]> {
    const unconcludedBuilds = builds
      .filter((build) => build.jobStatus === "complete" && !build.conclusion)
      .map(({ id }) => id);

    const screenshotDiffStatuses =
      await Build.getScreenshotDiffsStatuses(unconcludedBuilds);

    return builds.map((build) => {
      switch (build.jobStatus) {
        case "pending":
        case "progress":
          return Date.now() - new Date(build.createdAt).getTime() >
            BUILD_EXPIRATION_DELAY_MS
            ? ("expired" as const)
            : ("pending" as const);

        case "error":
        case "aborted":
          return build.jobStatus;

        case "complete": {
          const index = unconcludedBuilds.indexOf(build.id);
          // If the build is concluded, we don't need to check the diff status.
          if (index === -1) {
            return build.jobStatus;
          }
          const diffStatus = screenshotDiffStatuses[index];
          invariant(diffStatus, "diff status not found");
          return diffStatus;
        }
        default:
          assertNever(build.jobStatus);
      }
    });
  }

  /**
   * Compute stats for a list of builds.
   */
  static async computeStats(buildIds: string[]): Promise<BuildStats[]> {
    const data = (await ScreenshotDiff.query()
      .whereIn("buildId", buildIds)
      .leftJoinRelated("compareScreenshot")
      .select("buildId", raw(`(${ScreenshotDiff.selectDiffStatus}) as status`))
      .count("*")
      .groupBy("status", "buildId")) as unknown as {
      buildId: string;
      status: string;
      count: string;
    }[];

    return buildIds.map((buildId) => {
      return data.reduce(
        (res, input) => {
          if (input.buildId !== buildId) {
            return res;
          }
          return {
            ...res,
            [input.status]: Number(input.count),
            total: Number(input.count) + res.total,
          };
        },
        {
          failure: 0,
          added: 0,
          unchanged: 0,
          changed: 0,
          removed: 0,
          total: 0,
          retryFailure: 0,
        },
      );
    });
  }

  /**
   * Get the conclusion of builds.
   */
  static async computeConclusions(
    buildIds: string[],
    statuses: BuildStatus[],
  ): Promise<(BuildConclusion | null)[]> {
    const completeBuildIds = buildIds.filter(
      (_, index) => statuses[index] === "complete",
    );

    const buildsDiffCount = (completeBuildIds.length
      ? await ScreenshotDiff.query()
          .select("buildId")
          .leftJoinRelated("compareScreenshot")
          .count("*")
          .whereIn(raw(ScreenshotDiff.selectDiffStatus), [
            "added",
            "changed",
            "removed",
          ])
          .whereIn("buildId", completeBuildIds)
          .groupBy("buildId")
      : []) as unknown as { buildId: string; count: number }[];

    return buildIds.map((buildId, index) => {
      if (statuses[index] !== "complete") {
        return null;
      }
      const buildDiffCount = buildsDiffCount.find(
        (diff) => diff.buildId === buildId,
      );
      if (buildDiffCount && buildDiffCount.count > 0) {
        return "changes-detected";
      }
      return "no-changes";
    });
  }

  /**
   * Get the review status of builds.
   */
  static async getReviewStatuses(
    builds: Build[],
  ): Promise<(BuildReviewStatus | null)[]> {
    const diffDetectedBuildIds = builds
      .filter((build) => build.conclusion === "changes-detected")
      .map((build) => build.id);

    const reviews = diffDetectedBuildIds.length
      ? await BuildReview.query()
          .select("buildId", "state")
          .whereIn("buildId", diffDetectedBuildIds)
          .whereIn("state", ["approved", "rejected"]).andWhereRaw(`"id" IN (
            SELECT DISTINCT ON ("buildId")
              "id"
            FROM "build_reviews"
            WHERE "buildId" = "build_reviews"."buildId"
              AND "state" IN ('approved', 'rejected')
            ORDER BY "buildId", "createdAt" DESC
          )`)
      : [];

    return builds.map((build) => {
      if (build.conclusion !== "changes-detected") {
        return null;
      }

      const review = reviews.find((review) => review.buildId === build.id);

      if (!review) {
        return null;
      }

      switch (review.state) {
        case "approved":
          return "accepted";
        case "rejected":
          return "rejected";
        case "pending":
          throw new Error(
            "Unexpected review state, should be filtered in query",
          );
        default:
          assertNever(review.state);
      }
    });
  }

  static getUsers(buildId: string, { trx }: { trx?: TransactionOrKnex } = {}) {
    return User.query(trx)
      .leftJoinRelated(
        "[account.projects.builds, teams.account.projects.builds]",
      )
      .where("account:projects:builds.id", buildId)
      .orWhere("teams:account:projects:builds.id", buildId);
  }

  getUsers(options?: { trx?: TransactionOrKnex }) {
    return Build.getUsers(this.id, options);
  }

  async getUrl({ trx }: { trx?: TransactionOrKnex } = {}) {
    await this.$fetchGraph(
      "project.account",
      trx ? { transaction: trx, skipFetched: true } : { skipFetched: true },
    );
    invariant(this.project?.account, "account not found");

    const pathname = `/${this.project.account.slug}/${this.project.name}/builds/${this.number}`;

    return `${config.get("server.url")}${pathname}`;
  }

  static async getAggregatedBuildStatuses(
    builds: Build[],
  ): Promise<BuildAggregatedStatus[]> {
    const [statuses, reviewStatuses] = await Promise.all([
      Build.getStatuses(builds),
      Build.getReviewStatuses(builds),
    ]);
    return builds.map((build, index) => {
      if (reviewStatuses[index]) {
        return reviewStatuses[index];
      }
      if (build.conclusion) {
        return build.conclusion;
      }
      invariant(statuses[index], "status should be fetched");
      // A progress status at this point means that the build has just been
      // completed while the status was being fetched.
      // So we consider it as progress.
      if (statuses[index] === "complete") {
        return "progress";
      }

      return statuses[index];
    });
  }

  /**
   * To be used in a `Build.query().whereExists` clause.
   */
  static submittedReviewQuery() {
    return BuildReview.query()
      .select(1)
      .whereRaw('build_reviews."buildId" = builds.id')
      .whereIn("id", (qb) => {
        qb.select("id")
          .from("build_reviews")
          .whereRaw('build_reviews."buildId" = builds.id')
          .whereIn("state", ["approved", "rejected"])
          .orderBy("id", "desc")
          .limit(1);
      });
  }
}
