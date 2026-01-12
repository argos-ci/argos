import { invariant } from "@argos/util/invariant";
import { ValidationError } from "objection";
import type { Pojo, RelationMappings } from "objection";

import { Model } from "../util/model";
import type { JobStatus } from "../util/schemas";
import { jobModelSchema, timestampsSchema } from "../util/schemas";
import { Build } from "./Build";
import { File } from "./File";
import { Screenshot } from "./Screenshot";
import { Test } from "./Test";

export class ScreenshotDiff extends Model {
  static override tableName = "screenshot_diffs";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      jobModelSchema,
      {
        type: "object",
        required: ["buildId", "baseScreenshotId", "compareScreenshotId"],
        properties: {
          buildId: { type: "string" },
          baseScreenshotId: { type: ["string", "null"] },
          compareScreenshotId: { type: ["string", "null"] },
          s3Id: { type: ["string", "null"] },
          fileId: { type: ["string", "null"] },
          fingerprint: { type: ["string", "null"] },
          score: { type: ["number", "null"], minimum: 0, maximum: 1 },
          testId: { type: ["string", "null"] },
          group: { type: ["string", "null"] },
          ignored: { type: "boolean" },
        },
      },
    ],
  };

  buildId!: string;
  baseScreenshotId!: string | null;
  compareScreenshotId!: string | null;
  s3Id!: string | null;
  fileId!: string | null;
  /**
   * Fingerprint of the diff mask, like a "blurred" hash.
   * Only filled if a "fileId" is present.
   */
  fingerprint!: string | null;
  score!: number | null;
  jobStatus!: JobStatus;
  testId!: string | null;
  group!: string | null;
  ignored!: boolean;

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
      test: {
        relation: Model.BelongsToOneRelation,
        modelClass: Test,
        join: {
          from: "screenshot_diffs.testId",
          to: "tests.id",
        },
      },
    };
  }

  build?: Build;
  baseScreenshot?: Screenshot | null;
  compareScreenshot?: Screenshot | null;
  test?: Test | null;
  file?: File | null;

  static screenshotFailureRegexp = / \(failed\)\./;

  static selectDiffStatus = `
    CASE
      WHEN "compareScreenshotId" IS NULL
        THEN 'removed'
      WHEN "baseScreenshotId" IS NULL
        THEN
          CASE
            WHEN "name" ~ '${ScreenshotDiff.screenshotFailureRegexp.source}'
              THEN
                CASE
                  WHEN  (
                    -- Checks for absence of 'retry' and 'retries' or their values being null
                    (metadata->'test'->>'retry' IS NULL OR metadata->'test'->>'retries' IS NULL)
                    OR
                    -- Checks for 'retry' being equal to 'retries'
                    metadata->'test'->>'retry' = metadata->'test'->>'retries'
                  )
                  THEN 'failure'
                  ELSE 'retryFailure'
                END
            ELSE 'added'
          END
      WHEN "score" IS NOT NULL AND "score" > 0
        THEN
          CASE
            WHEN "ignored" IS true
              THEN 'ignored'
            ELSE 'changed'
          END
      ELSE 'unchanged'
    END
  `;

  static sortDiffByStatus = `
    CASE
      WHEN "compareScreenshotId" IS NULL
        THEN 3 -- removed
      WHEN "baseScreenshotId" IS NULL
        THEN
          CASE
            WHEN "compareScreenshot"."name" ~ '${ScreenshotDiff.screenshotFailureRegexp.source}'
              THEN
                CASE
                  WHEN  (
                    -- Checks for absence of 'retry' and 'retries' or their values being null
                    ("compareScreenshot".metadata->'test'->>'retry' IS NULL OR "compareScreenshot".metadata->'test'->>'retries' IS NULL)
                    OR
                    -- Checks for 'retry' being equal to 'retries'
                    "compareScreenshot".metadata->'test'->>'retry' = "compareScreenshot".metadata->'test'->>'retries'
                  )
                  THEN 0 -- failure
                  ELSE 5 -- retryFailure
                END
            ELSE 2 -- added
          END
      WHEN "score" IS NOT NULL AND "score" > 0
        THEN
          CASE
            WHEN "ignored" IS true
              THEN 6 -- ignored
            ELSE 1 -- changed
          END
      ELSE 4 -- unchanged
    END ASC
  `;

  $getDiffStatus = async (
    loadScreenshot?: (screenshotId: string) => Promise<Screenshot>,
  ) => {
    if (!this.compareScreenshotId) {
      return "removed";
    }

    if (!this.baseScreenshotId) {
      const compareScreenshot = await (() => {
        if (this.compareScreenshot) {
          return this.compareScreenshot;
        }
        invariant(
          loadScreenshot,
          "compareScreenshot is not loaded and no loader is provided",
        );
        return loadScreenshot(this.compareScreenshotId);
      })();

      const { name, metadata } = compareScreenshot;
      return ScreenshotDiff.screenshotFailureRegexp.test(name)
        ? metadata?.test?.retry == null ||
          metadata?.test?.retries == null ||
          metadata.test.retry === metadata.test.retries
          ? "failure"
          : "retryFailure"
        : "added";
    }

    if (this.score === null) {
      return "pending";
    }

    if (this.score > 0) {
      if (this.ignored) {
        return "ignored";
      }
      return "changed";
    }
    return "unchanged";
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
