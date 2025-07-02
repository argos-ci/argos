import { Model } from "objection";

import { File } from "./File";
import { Project } from "./Project";
import { Test } from "./Test";

export class IgnoredFile extends Model {
  static override tableName = "ignored_files";

  static override get idColumn() {
    return ["projectId", "testId", "fileId"];
  }

  static override get jsonSchema() {
    return {
      type: "object",
      required: ["projectId", "testId", "fileId"],
      properties: {
        projectId: { type: "string" },
        testId: { type: "string" },
        fileId: { type: "string" },
      },
    };
  }

  projectId!: string;
  fileId!: string;
  testId!: string;

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
    file: {
      relation: Model.BelongsToOneRelation,
      modelClass: File,
      join: {
        from: "ignored_files.fileId",
        to: "files.id",
      },
    },
  };

  project?: Project;
  test?: Test;
  file?: File;
}
