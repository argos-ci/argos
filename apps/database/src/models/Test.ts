import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Project } from "./Project.js";
import { Screenshot } from "./Screenshot.js";
import { ScreenshotDiff } from "./ScreenshotDiff.js";

export class Test extends Model {
  static override tableName = "tests";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["name", "repositoryId", "buildName"],
    properties: {
      name: { type: "string" },
      repositoryId: { type: "string" },
      buildName: { type: "string" },
      status: {
        type: ["string"],
        enum: ["pending", "flaky", "resolved"],
      },
      resolvedDate: { type: ["string", "null"] },
      resolvedStabilityScore: { type: ["number", "null"] },
      muted: { type: "boolean" },
      muteUntil: { type: ["string", "null"] },
    },
  });

  name!: string;
  repositoryId!: string;
  buildName!: string;
  status!: string;
  resolvedDate!: string | null;
  resolvedStabilityScore!: number | null;
  muted!: boolean;
  muteUntil!: string | null;

  static override virtualAttributes = ["mute"];

  get mute() {
    if (!this.muted) return false;
    if (!this.muteUntil) return true;
    const now = new Date();
    const muteUntilDate = new Date(this.muteUntil);
    return muteUntilDate > now;
  }

  static override get relationMappings(): RelationMappings {
    return {
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: Project,
        join: {
          from: "tests.projectId",
          to: "projects.id",
        },
      },
      screenshots: {
        relation: Model.HasManyRelation,
        modelClass: Screenshot,
        join: {
          from: "tests.id",
          to: "screenshots.testId",
        },
      },
      screenshotDiffs: {
        relation: Model.HasManyRelation,
        modelClass: ScreenshotDiff,
        join: {
          from: "tests.id",
          to: "screenshot_diffs.testId",
        },
      },
      lastScreenshotDiff: {
        relation: Model.HasOneRelation,
        modelClass: ScreenshotDiff,
        join: {
          from: "tests.id",
          to: "screenshot_diffs.testId",
        },
        modify: (queryBuilder) => {
          queryBuilder.orderBy("screenshot_diffs.createdAt", "desc").first();
        },
      },
    };
  }

  project?: Project;
  screenshotDiffs?: ScreenshotDiff[];
  screenshots?: Screenshot[];
  lastScreenshotDiff?: ScreenshotDiff;
}
