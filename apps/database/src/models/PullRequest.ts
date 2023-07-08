import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Build } from "./Build.js";
import { Project } from "./Project.js";

export class PullRequest extends Model {
  static override tableName = "pull_requests";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["projectId", "number"],
    properties: {
      number: { type: "integer" },
      projectId: { type: "string" },
      commentId: { type: ["number", "null"] },
    },
  });

  projectId!: string;
  number!: number;
  commentId!: number | null;

  static override get relationMappings(): RelationMappings {
    return {
      builds: {
        relation: Model.ManyToManyRelation,
        modelClass: Build,
        join: {
          from: "pull_requests.id",
          to: "builds.pullRequestId",
        },
      },
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: Project,
        join: {
          from: "pull_requests.projectId",
          to: "projects.id",
        },
      },
    };
  }

  builds?: Build[];
  project?: Project;
}
