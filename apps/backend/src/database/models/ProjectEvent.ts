import {
  PROJECT_EVENTS,
  type ProjectEventName,
} from "@argos/schemas/project-event";
import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Project } from "./Project";

/**
 * Something that happened in a project, as webhooks and the events feed
 * deliver it. `data` is the payload documented for its `name`.
 */
export class ProjectEvent extends Model {
  static override tableName = "project_events";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["projectId", "name", "data"],
        properties: {
          projectId: { type: "string" },
          name: { type: "string", enum: PROJECT_EVENTS },
          data: { type: "object" },
        },
      },
    ],
  };

  projectId!: string;
  name!: ProjectEventName;
  data!: Record<string, unknown>;

  static override get jsonAttributes() {
    return ["data"];
  }

  static override get relationMappings(): RelationMappings {
    return {
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: Project,
        join: {
          from: "project_events.projectId",
          to: "projects.id",
        },
      },
    };
  }

  project?: Project;
}
