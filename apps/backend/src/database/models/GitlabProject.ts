import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { timestampsSchema } from "../util/schemas.js";
import { Project } from "./Project.js";

export class GitlabProject extends Model {
  static override tableName = "gitlab_projects";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: [
          "name",
          "path",
          "pathWithNamespace",
          "visibility",
          "defaultBranch",
          "gitlabId",
        ],
        properties: {
          name: { type: "string" },
          path: { type: "string" },
          pathWithNamespace: { type: "string" },
          visibility: {
            type: "string",
            enum: ["public", "private", "internal"],
          },
          defaultBranch: { type: "string" },
          gitlabId: { type: "number" },
        },
      },
    ],
  };

  name!: string;
  path!: string;
  pathWithNamespace!: string;
  visibility!: "public" | "private" | "internal";
  defaultBranch!: string;
  gitlabId!: number;

  static override get relationMappings(): RelationMappings {
    return {
      projects: {
        relation: Model.HasManyRelation,
        modelClass: Project,
        join: {
          from: "gitlab_projects.id",
          to: "projects.gitlabProjectId",
        },
      },
    };
  }

  projects?: Project[] | null;

  static override virtualAttributes = ["private"];

  get private() {
    return this.visibility === "private" || this.visibility === "internal";
  }
}
