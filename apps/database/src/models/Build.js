import { ValidationError } from "objection";
import config from "@argos-ci/config";
import { Model, mergeSchemas, timestampsSchema, jobModelSchema } from "../util";
import { User } from "./User";
import { ScreenshotBucket } from "./ScreenshotBucket";
import { ScreenshotDiff } from "./ScreenshotDiff";
import { Repository } from "./Repository";

const NEXT_NUMBER = Symbol("nextNumber");

function reduceBuildStatuses(buildStatuses) {
  const diffStatuses = buildStatuses.map(({ jobStatus }) => jobStatus);

  if (diffStatuses.includes("error")) {
    return "error";
  }

  if (diffStatuses.length === 1 && diffStatuses[0] === "complete") {
    return "complete";
  }

  return "progress";
}

function buildStatusesQuery(buildIds) {
  return ScreenshotDiff.query()
    .select("buildId", "jobStatus")
    .whereIn("buildId", buildIds)
    .groupBy("buildId", "jobStatus");
}

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
        type: { type: ["string", null] },
      },
    });
  }

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

  /** State of Argos processing builds
   * build.status: pending | progress | complete | error | aborted
   */
  static async getStatuses(builds) {
    const buildStatuses = await buildStatusesQuery(
      builds
        .filter(({ jobStatus }) => jobStatus === "complete")
        .map(({ id }) => id)
    );

    return builds.map((build) => {
      if (["error", "aborted"].includes(build.jobStatus)) {
        return build.jobStatus;
      }
      if (build.jobStatus !== "complete") {
        return "pending";
      }
      return reduceBuildStatuses(
        buildStatuses.filter(({ buildId }) => buildId === build.id)
      );
    });
  }

  async $getStatus(options) {
    const statuses = await this.constructor.getStatuses([this], options);
    return statuses[0];
  }

  /** Builds conclusions
   * build.conclusion: null | stable | diffDetected
   */
  static async getConclusions(builds) {
    const buildStatuses = await this.getStatuses(builds);
    const buildDiffCount = await ScreenshotDiff.query()
      .select("buildId")
      .count()
      .where("score", ">", 0)
      .whereIn(
        "buildId",
        builds.map(({ id }) => id)
      )
      .groupBy("buildId")
      .first();

    return builds.map((build, index) => {
      if (buildStatuses[index] !== "complete") return null;
      return buildDiffCount && buildDiffCount.count > 0
        ? "diffDetected"
        : "stable";
    });
  }

  /** Build review status
   * build.reviewStatus: null | accepted | rejected
   */
  static async getReviewStatuses(builds) {
    const buildConclusions = await this.getConclusions(builds);
    const buildIds = builds
      .filter((build, index) => buildConclusions[index] === "diffDetected")
      .map(({ id }) => id);

    const buildStatuses = await ScreenshotDiff.query()
      .select("buildId", "validationStatus")
      .whereIn("buildId", buildIds)
      .groupBy("buildId", "validationStatus");

    return builds.map((build, index) => {
      if (buildConclusions[index] !== "diffDetected") return null;
      const status = buildStatuses
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
    return this.constructor.getUsers(this.id, options);
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
