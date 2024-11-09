import {
  AllCondition,
  AutomationAction,
  AutomationEvent,
} from "@/automation/index.js";

import { Model } from "../util/model.js";
import { Project } from "./Project";

export class AutomationRule extends Model {
  static override tableName = "automation_rules";

  static override jsonSchema = {
    type: "object",
    required: ["active", "name", "projectId", "on", "if", "then"],
    properties: {
      active: { type: "boolean" },
      name: { type: "string" },
      projectId: { type: "string" },
      on: {
        type: "array",
        items: { type: "string" },
      },
      if: { type: "object" },
      then: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            payload: { type: "object" },
          },
        },
      },
    },
  };

  active!: boolean;
  name!: string;
  projectId!: string;
  on!: AutomationEvent[];
  if!: AllCondition;
  then!: AutomationAction[];

  static override relationMappings = {
    project: {
      relation: Model.BelongsToOneRelation,
      modelClass: Project,
      join: {
        from: "automation_rules.projectId",
        to: "projects.id",
      },
    },
  };

  project?: Project;
}
