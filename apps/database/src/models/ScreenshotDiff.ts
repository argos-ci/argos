import { ValidationError } from "objection";
import type { Pojo, RelationMappings } from "objection";

import { Model } from "../util/model.js";
import type { JobStatus } from "../util/schemas.js";
import {
  jobModelSchema,
  mergeSchemas,
  timestampsSchema,
} from "../util/schemas.js";
import { Build } from "./Build.js";
import { File } from "./File.js";
import { Screenshot } from "./Screenshot.js";

export class ScreenshotDiff extends Model {
  static override tableName = "screenshot_diffs";

  static override jsonSchema = mergeSchemas(timestampsSchema, jobModelSchema, {
    required: [
      "buildId",
      "baseScreenshotId",
      "compareScreenshotId",
      "validationStatus",
    ],
    properties: {
      buildId: { type: "string" },
      baseScreenshotId: { type: ["string", "null"] },
      compareScreenshotId: { type: ["string", "null"] },
      s3Id: { type: ["string", "null"] },
      fileId: { type: ["string", "null"] },
      score: { type: ["number", "null"], minimum: 0, maximum: 1 },
      stabilityScore: { type: ["number", "null"], minimum: 0, maximum: 100 },
      validationStatus: {
        type: "string",
        enum: ["unknown", "accepted", "rejected"],
      },
    },
  });

  buildId!: string;
  baseScreenshotId!: string | null;
  compareScreenshotId!: string | null;
  s3Id!: string | null;
  fileId!: string | null;
  score!: number | null;
  stabilityScore!: number | null;
  jobStatus!: JobStatus;
  validationStatus!: "unknown" | "accepted" | "rejected";

  static override get relationMappings(): RelationMappings {
    return {
      build: {
        relation: Model.BelongsToOneRelation,
        modelClass: Build,
        join: {
          from: "screenshot_diffs.buildId",
          to: "builds.id",
        },
      },
      baseScreenshot: {
        relation: Model.BelongsToOneRelation,
        modelClass: Screenshot,
        join: {
          from: "screenshot_diffs.baseScreenshotId",
          to: "screenshots.id",
        },
      },
      compareScreenshot: {
        relation: Model.BelongsToOneRelation,
        modelClass: Screenshot,
        join: {
          from: "screenshot_diffs.compareScreenshotId",
          to: "screenshots.id",
        },
      },
      file: {
        relation: Model.HasOneRelation,
        modelClass: File,
        join: {
          from: "screenshot_diffs.fileId",
          to: "files.id",
        },
      },
    };
  }

  build?: Build;
  baseScreenshot?: Screenshot | null;
  compareScreenshot?: Screenshot | null;

  static screenshotFailureRegexp = `(${Object.values({
    cypress: " \\(failed\\)\\.",
    playwright: "-failed-",
  }).join("|")})`;

  static selectDiffStatus = `CASE \
    WHEN "compareScreenshotId" IS NULL \
      THEN 'removed' \
    WHEN "baseScreenshotId" IS NULL \
      AND "name" ~ '${ScreenshotDiff.screenshotFailureRegexp}' \
      THEN 'failure'  \
    WHEN "baseScreenshotId" IS NULL \
      THEN 'added' \
    WHEN "score" IS NOT NULL AND "score" > 0 \
      THEN 'changed' \
    ELSE 'unchanged'  \
    END \
    AS status`;

  static sortDiffByStatus = `CASE \
    WHEN "compareScreenshotId" IS NULL \
      THEN 3 -- removed
    WHEN "baseScreenshotId" IS NULL \
      AND "compareScreenshot"."name" ~ '${ScreenshotDiff.screenshotFailureRegexp}' \
      THEN 0 -- failure
    WHEN "baseScreenshotId" IS NULL  \
      THEN 2 -- added
    WHEN "score" IS NOT NULL AND "score" > 0 \
      THEN 1 -- changed
    ELSE 4 -- unchanged
    END ASC`;

  $getDiffStatus = async (
    loadScreenshot: (screenshotId: string) => Promise<Screenshot>
  ) => {
    if (!this.compareScreenshotId) return "removed";

    if (!this.baseScreenshotId) {
      const { name } = await loadScreenshot(this.compareScreenshotId);
      return name.match(ScreenshotDiff.screenshotFailureRegexp)
        ? "failure"
        : "added";
    }

    return this.score && this.score > 0 ? "changed" : "unchanged";
  };

  override $parseDatabaseJson(json: Pojo) {
    const newJson = super.$parseDatabaseJson(json);

    if (typeof newJson["score"] === "string") {
      newJson["score"] = Number(newJson["score"]);
    }

    return newJson;
  }

  override $afterValidate(json: Pojo) {
    if (
      json["baseScreenshotId"] &&
      json["baseScreenshotId"] === json["compareScreenshotId"]
    ) {
      throw new ValidationError({
        type: "ModelValidation",
        message: "The base screenshot should be different to the compare one.",
      });
    }
  }
}
