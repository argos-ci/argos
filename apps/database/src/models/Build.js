import { ValidationError } from "objection";
import config from "@argos-ci/config";
import { Model, mergeSchemas, timestampsSchema, jobModelSchema } from "../util";
import { User } from "./User";
import { ScreenshotBucket } from "./ScreenshotBucket";
import { ScreenshotDiff } from "./ScreenshotDiff";
import { Repository } from "./Repository";

const NEXT_NUMBER = Symbol("nextNumber");

export class Build extends Model {
  static get tableName() {
    return "builds";
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, jobModelSchema, {
      required: ["compareScreenshotBucketId", "repositoryId"],
      properties: {
        baseScreenshotBucketId: { types: ["string", null] },
        compareScreenshotBucketId: { type: "string" },
        repositoryId: { type: "string" },
        number: { type: "integer" },
        externalId: { type: ["string", null] },
        batchCount: { type: ["integer", null] },
        totalBatch: { type: ["integer", null] },
        type: { type: ["string", null] },
      },
    });
  }

  /** @type {string} */
  id;

  /** @type {'pending' | 'progress' | 'complete' | 'error' | 'aborted'} */
  jobStatus;

  /** @type {string | null} */
  baseScreenshotBucketId;

  /** @type {import('./ScreenshotBucket').ScreenshotBucket | undefined | null} */
  baseScreenshotBucket;

  /** @type {string} */
  compareScreenshotBucketId;

  /** @type {import('./ScreenshotBucket').ScreenshotBucket | undefined} */
  compareScreenshotBucket;

  /** @type {string} */
  repositoryId;

  /** @type {import('./Repository').Repository | undefined} */
  repository;

  /** @type {number} */
  number;

  /** @type {string | null} */
  externalId;

  /** @type {number | null} */
  batchCount;

  /** @type {number | null} */
  totalBatch;

  static get relationMappings() {
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
      repository: {
        relation: Model.BelongsToOneRelation,
        modelClass: Repository,
        join: {
          from: "builds.repositoryId",
          to: "repositories.id",
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
    };
  }

  // eslint-disable-next-line class-methods-use-this
  $afterValidate(json) {
    if (
      json.baseScreenshotBucketId &&
      json.baseScreenshotBucketId === json.compareScreenshotBucketId
    ) {
      throw new ValidationError({
        type: ValidationError.Type.ModelValidation,
        message:
          "The base screenshot bucket should be different to the compare one.",
      });
    }
  }

  $beforeInsert(queryContext) {
    super.$beforeInsert(queryContext);
    if (this.number === undefined) {
      this.number = NEXT_NUMBER;
    }
  }

  $toDatabaseJson(queryContext) {
    const json = super.$toDatabaseJson(queryContext);
    if (json.number === NEXT_NUMBER) {
      json.number = this.$knex().raw(
        '(select coalesce(max(number),0) + 1 as number from builds where "repositoryId" = ?)',
        this.repositoryId
      );
    }
    return json;
  }

  $afterInsert(queryContext) {
    super.$afterInsert(queryContext);
    return this.reload(queryContext);
  }

  /**
   * Get status of the build.
   * Aggregate statuses from screenshot diffs.
   * @param {Build[]} builds
   */
  static async getStatuses(builds) {
    const completeBuildIds = builds
      .filter(({ jobStatus }) => jobStatus === "complete")
      .map(({ id }) => id);

    const screenshotDiffs = await ScreenshotDiff.query()
      .select("buildId", "jobStatus")
      .whereIn("buildId", completeBuildIds)
      .groupBy("buildId", "jobStatus");

    return builds.map((build) => {
      switch (build.jobStatus) {
        case "pending":
        case "progress":
          return Date.now() - new Date(build.createdAt).getTime() >
            2 * 3600 * 1000
            ? "expired"
            : "pending";

        case "error":
        case "aborted":
          return build.jobStatus;

        case "complete": {
          const diffJobStatuses = screenshotDiffs
            .filter(({ buildId }) => build.id === buildId)
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
        }
        default:
          throw new Error(`Unknown job status: ${build.jobStatus}`);
      }
    });
  }

  /**
   * Get status of the current build.
   */
  async $getStatus() {
    const statuses = await Build.getStatuses([this]);
    return statuses[0];
  }

  /**
   * Get the conclusion of builds.
   * @param {Build[]} builds
   */
  static async getConclusions(builds) {
    const buildIds = builds.map(({ id }) => id);
    const [buildStatuses, buildsDiffCount] = await Promise.all([
      this.getStatuses(builds),
      ScreenshotDiff.query()
        .select("buildId")
        .count()
        .where("score", ">", 0)
        .whereIn("buildId", buildIds)
        .groupBy("buildId"),
    ]);
    return builds.map((build, index) => {
      if (buildStatuses[index] !== "complete") return null;
      const buildDiffCount = buildsDiffCount.find(
        ({ buildId }) => buildId === build.id
      );
      return buildDiffCount && buildDiffCount.count > 0
        ? "diffDetected"
        : "stable";
    });
  }

  /**
   * Get the review status of builds.
   * @param {Build[]} builds
   */
  static async getReviewStatuses(builds) {
    const buildConclusions = await this.getConclusions(builds);
    const diffDetectedBuildIds = builds
      .filter((_build, index) => buildConclusions[index] === "diffDetected")
      .map(({ id }) => id);

    const screenshotDiffs = await ScreenshotDiff.query()
      .select("buildId", "validationStatus")
      .whereIn("buildId", diffDetectedBuildIds)
      .groupBy("buildId", "validationStatus");

    return builds.map((build, index) => {
      if (buildConclusions[index] !== "diffDetected") return null;
      const status = screenshotDiffs
        .filter(({ buildId }) => buildId === build.id)
        .map(({ validationStatus }) => validationStatus);
      if (status.includes("rejected")) return "rejected";
      if (status.length === 1 && status[0] === "accepted") return "accepted";
      return null;
    });
  }

  static getUsers(buildId, { trx } = {}) {
    return User.query(trx)
      .select("users.*")
      .join(
        "user_repository_rights",
        "users.id",
        "=",
        "user_repository_rights.userId"
      )
      .join(
        "repositories",
        "user_repository_rights.repositoryId",
        "=",
        "repositories.id"
      )
      .join("builds", "repositories.id", "=", "builds.repositoryId")
      .where("builds.id", buildId);
  }

  getUsers(options) {
    return Build.getUsers(this.id, options);
  }

  async getUrl({ trx } = {}) {
    if (!this.repository) {
      await this.$fetchGraph("repository", { transaction: trx });
    }

    const owner = await this.repository.$relatedOwner({ trx });

    const pathname = `/${owner.login}/${this.repository.name}/builds/${this.number}`;

    return `${config.get("server.url")}${pathname}`;
  }
}
