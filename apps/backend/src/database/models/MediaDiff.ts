import type { Pojo, RelationMappings } from "objection";

import { Model } from "../util/model";
import type { JobStatus } from "../util/schemas";
import { jobModelSchema, timestampsSchema } from "../util/schemas";
import { MediaVersion } from "./MediaVersion";

/**
 * The pixel diff between the two halves of a before/after {@link Media} pair,
 * computed with the same engine a build's {@link ScreenshotDiff} uses.
 *
 * Identified by the two {@link MediaVersion}s it was computed from rather than
 * by the two media, which is what keeps it honest: re-uploading either half
 * makes a new pair, so it makes a new row, so a viewer looking at a given pair
 * either sees the diff computed from exactly those bytes or sees none at all.
 * A stale mask is not a state this table can be in.
 */
export class MediaDiff extends Model {
  static override tableName = "media_diffs";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      jobModelSchema,
      {
        type: "object" as const,
        required: ["beforeMediaVersionId", "afterMediaVersionId"],
        properties: {
          beforeMediaVersionId: { type: "string" },
          afterMediaVersionId: { type: "string" },
          score: { type: ["number", "null"], minimum: 0, maximum: 1 },
          key: { type: ["string", "null"] },
          width: { type: ["number", "null"], minimum: 0 },
          height: { type: ["number", "null"], minimum: 0 },
        },
      },
    ],
  };

  static override get relationMappings(): RelationMappings {
    return {
      beforeVersion: {
        relation: Model.BelongsToOneRelation,
        modelClass: MediaVersion,
        join: {
          from: "media_diffs.beforeMediaVersionId",
          to: "media_versions.id",
        },
      },
      afterVersion: {
        relation: Model.BelongsToOneRelation,
        modelClass: MediaVersion,
        join: {
          from: "media_diffs.afterMediaVersionId",
          to: "media_versions.id",
        },
      },
    };
  }

  beforeMediaVersionId!: string;
  afterMediaVersionId!: string;
  jobStatus!: JobStatus;
  /**
   * Share of pixels that differ, 0 to 1. Null until the job has run, 0 when the
   * two halves are identical, and 1 when their layouts differ — which odiff
   * reports instead of a per-pixel score.
   */
  score!: number | null;
  /**
   * Content-addressed key of the diff mask, a PNG whose opaque pixels are the
   * ones that differ. Null when there is nothing to draw: the job has not run,
   * or it ran and found the two halves identical.
   */
  key!: string | null;
  /** The mask's dimensions — the union of the two halves. See {@link key}. */
  width!: number | null;
  height!: number | null;

  beforeVersion?: MediaVersion;
  afterVersion?: MediaVersion;

  override $parseDatabaseJson(json: Pojo) {
    const newJson = super.$parseDatabaseJson(json);

    // `numeric` arrives as a string from pg, same as `screenshot_diffs.score`.
    if (typeof newJson["score"] === "string") {
      newJson["score"] = Number(newJson["score"]);
    }

    return newJson;
  }
}
