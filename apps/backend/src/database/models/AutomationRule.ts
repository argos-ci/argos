import {
  AUTOMATION_ACTIONS,
  AutomationActionsName,
  GetActionPayload,
} from "@/automation/actions/index.js";
import {
  AllCondition,
  AutomationConditionJsonSchema,
} from "@/automation/types/conditions.js";
import {
  AutomationEvent,
  AutomationEvents,
} from "@/automation/types/events.js";

import { Model } from "../util/model.js";
import { timestampsSchema } from "../util/schemas.js";
import { Project } from "./Project";

type AutomationThen = {
  [K in AutomationActionsName]: {
    action: K;
    actionPayload: GetActionPayload<K>;
  };
}[AutomationActionsName];

export class AutomationRule extends Model {
  static override tableName = "automation_rules";

  static override get jsonAttributes() {
    return ["on", "if", "then"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["active", "name", "projectId", "on", "if", "then"],
        properties: {
          active: { type: "boolean" },
          name: { type: "string" },
          projectId: { type: "string" },
          on: {
            type: "array",
            items: {
              type: "string",
              enum: Object.values(AutomationEvents),
            },
          },
          if: {
            type: "object",
            required: ["all"],
            properties: {
              all: {
                type: "array",
                items: AutomationConditionJsonSchema,
              },
            },
          },
          then: {
            type: "array",
            items: {
              type: "object",
              oneOf: AUTOMATION_ACTIONS.map((action) => ({
                type: "object",
                required: ["action", "actionPayload"],
                properties: {
                  action: { const: action.name },
                  actionPayload: action.payloadJsonSchema,
                },
              })),
            },
          },
        },
      },
    ],
  };

  active!: boolean;
  name!: string;
  projectId!: string;
  on!: AutomationEvent[];
  if!: AllCondition;
  then!: AutomationThen[];

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
