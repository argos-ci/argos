import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Project } from "./Project";
import { ProjectToken } from "./ProjectToken";

export class ProjectTokenProject extends Model {
  static override tableName = "project_token_projects";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["projectTokenId", "projectId"],
        properties: {
          projectTokenId: { type: "string" },
          projectId: { type: "string" },
        },
      },
    ],
  };

  projectTokenId!: string;
  projectId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      projectToken: {
        relation: Model.BelongsToOneRelation,
        modelClass: ProjectToken,
        join: {
          from: "project_token_projects.projectTokenId",
          to: "project_tokens.id",
        },
      },
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: Project,
        join: {
          from: "project_token_projects.projectId",
          to: "projects.id",
        },
      },
    };
  }

  projectToken?: ProjectToken;
  project?: Project;
}
