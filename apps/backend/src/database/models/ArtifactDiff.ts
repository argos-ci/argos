import { invariant } from "@argos/util/invariant";
import { ValidationError } from "objection";
import type { Pojo, RelationMappings } from "objection";

import { Model } from "../util/model";
import type { JobStatus } from "../util/schemas";
import { jobModelSchema, timestampsSchema } from "../util/schemas";
import { Artifact } from "./Artifact";
import { Build } from "./Build";
import { File } from "./File";
import { Test } from "./Test";

export class ArtifactDiff extends Model {
  static override tableName = "artifact_diffs";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      jobModelSchema,
      {
        type: "object",
        required: ["buildId", "baseArtifactId", "headArtifactId"],
        properties: {
          buildId: { type: "string" },
          baseArtifactId: { type: ["string", "null"] },
          headArtifactId: { type: ["string", "null"] },
          s3Id: { type: ["string", "null"] },
          fileId: { type: ["string", "null"] },
          score: { type: ["number", "null"], minimum: 0, maximum: 1 },
          testId: { type: ["string", "null"] },
          group: { type: ["string", "null"] },
          ignored: { type: "boolean" },
        },
      },
    ],
  };

  buildId!: string;
  baseArtifactId!: string | null;
  headArtifactId!: string | null;
  s3Id!: string | null;
  fileId!: string | null;
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
          from: "artifact_diffs.buildId",
          to: "builds.id",
        },
      },
      baseArtifact: {
        relation: Model.BelongsToOneRelation,
        modelClass: Artifact,
        join: {
          from: "artifact_diffs.baseArtifactId",
          to: "artifacts.id",
        },
      },
      headArtifact: {
        relation: Model.BelongsToOneRelation,
        modelClass: Artifact,
        join: {
          from: "artifact_diffs.headArtifactId",
          to: "artifacts.id",
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
  baseArtifact?: Artifact | null;
  headArtifact?: Artifact | null;
  test?: Test | null;
  file?: File | null;

  static artifactFailureRegexp = / \(failed\)\./;

  static selectDiffStatus = `
    CASE
      WHEN "headArtifactId" IS NULL
        THEN 'removed'
      WHEN "baseArtifactId" IS NULL
        THEN
          CASE
            WHEN "name" ~ '${ArtifactDiff.artifactFailureRegexp.source}'
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
            WHEN "headArtifact"."name" ~ '${ArtifactDiff.artifactFailureRegexp.source}'
              THEN
                CASE
                  WHEN  (
                    -- Checks for absence of 'retry' and 'retries' or their values being null
                    ("headArtifact".metadata->'test'->>'retry' IS NULL OR "headArtifact".metadata->'test'->>'retries' IS NULL)
                    OR
                    -- Checks for 'retry' being equal to 'retries'
                    "headArtifact".metadata->'test'->>'retry' = "headArtifact".metadata->'test'->>'retries'
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
    loadArtifact?: (artifactId: string) => Promise<Artifact>,
  ) => {
    if (!this.headArtifactId) {
      return "removed";
    }

    if (!this.baseArtifactId) {
      const headArtifact = await (() => {
        if (this.headArtifact) {
          return this.headArtifact;
        }
        invariant(
          loadArtifact,
          "headArtifact is not loaded and no loader is provided",
        );
        return loadArtifact(this.headArtifactId);
      })();

      const { name, metadata } = headArtifact;
      return ArtifactDiff.artifactFailureRegexp.test(name)
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
      json["baseArtifactId"] &&
      json["baseArtifactId"] === json["headArtifactId"]
    ) {
      throw new ValidationError({
        type: "ModelValidation",
        message: "The base artifact should be different to the head one.",
      });
    }
  }
}
