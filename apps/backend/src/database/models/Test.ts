import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Project } from "./Project";
import { Screenshot } from "./Screenshot";
import { ScreenshotDiff } from "./ScreenshotDiff";

export class Test extends Model {
  static override tableName = "tests";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["name", "projectId", "buildName"],
        properties: {
          name: { type: "string", maxLength: 1024 },
          projectId: { type: "string" },
          buildName: { type: "string", maxLength: 255 },
        },
      },
    ],
  };

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
