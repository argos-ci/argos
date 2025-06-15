import type { JSONSchema } from "objection";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

import {
  AUTOMATION_ACTIONS,
  AutomationActionsName,
  GetActionPayload,
} from "@/automation/actions/index.js";
import {
  AllCondition,
  AutomationConditionSchema,
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

export const AutomationRuleSchema = z.object({
  active: z.boolean(),
  name: z.string().min(3).max(100),
  projectId: z.string(),
  on: z.array(z.nativeEnum(AutomationEvents)),
  if: z.object({
    all: z.array(AutomationConditionSchema),
  }),
  then: z.array(
    z.union(
      AUTOMATION_ACTIONS.map((action) =>
        z.object({
          action: z.literal(action.name),
          actionPayload: action.payloadSchema,
        }),
      ) as any,
    ),
  ),
});

export class AutomationRule extends Model {
  static override tableName = "automation_rules";

  static override get jsonAttributes() {
    return ["on", "if", "then"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      zodToJsonSchema(AutomationRuleSchema, {
        removeAdditionalStrategy: "strict",
      }) as JSONSchema,
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
