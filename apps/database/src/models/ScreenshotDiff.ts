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
      score: {
        type: ["number", "null"],
        minimum: 0,
        maximum: 1,
      },
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
  score!: number | null;
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
    };
  }

  build?: Build;
  baseScreenshot?: Screenshot | null;
  compareScreenshot?: Screenshot | null;

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
