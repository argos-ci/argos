import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Project } from "./Project.js";
import { Screenshot } from "./Screenshot.js";
import { ScreenshotDiff } from "./ScreenshotDiff.js";

export class Test extends Model {
  static override tableName = "tests";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["name", "projectId", "buildName"],
    properties: {
      name: { type: "string", maxLength: 1024 },
      projectId: { type: "string" },
      buildName: { type: "string", maxLength: 255 },
    },
  });

  name!: string;
  projectId!: string;
  buildName!: string;

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
    };
  }

  project?: Project;
  screenshotDiffs?: ScreenshotDiff[];
  screenshots?: Screenshot[];
}
