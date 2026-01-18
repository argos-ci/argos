import { Model } from "objection";

import { Project } from "./Project";
import { Test } from "./Test";

export class IgnoredChange extends Model {
  static override tableName = "ignored_changes";

  static override get idColumn() {
    return ["projectId", "testId", "fingerprint"];
  }

  static override get jsonSchema() {
    return {
      type: "object",
      required: ["projectId", "testId", "fingerprint"],
      properties: {
        projectId: { type: "string" },
        testId: { type: "string" },
        fingerprint: { type: "string" },
      },
    };
  }

  projectId!: string;
  testId!: string;
  fingerprint!: string;

  static override relationMappings = {
    project: {
      relation: Model.BelongsToOneRelation,
      modelClass: Project,
      join: {
        from: "ignored_files.projectId",
        to: "projects.id",
      },
    },
    test: {
      relation: Model.BelongsToOneRelation,
      modelClass: Test,
      join: {
        from: "ignored_files.testId",
        to: "tests.id",
      },
    },
  };

  project?: Project;
  test?: Test;
}
