import { Model } from "objection";

import { File } from "./File";
import { Project } from "./Project";

export class IgnoredFile extends Model {
  static override tableName = "ignored_files";

  projectId!: number;
  fileId!: number;

  static override get idColumn() {
    return ["projectId", "fileId"];
  }

  static override get jsonSchema() {
    return {
      type: "object",
      required: ["projectId", "fileId"],
      properties: {
        projectId: { type: "string" },
        fileId: { type: "string" },
      },
    };
  }

  static override relationMappings = {
    project: {
      relation: Model.BelongsToOneRelation,
      modelClass: Project,
      join: {
        from: "ignored_files.projectId",
        to: "projects.id",
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
  file?: File;
}
