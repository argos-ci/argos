import { AutomationConditionSchema } from "@argos/schemas/automation-condition";
import { AutomationEventSchema } from "@argos/schemas/automation-event";
import type { JSONSchema } from "objection";
import { z } from "zod";

import { AutomationActionSchema } from "@/automation/actions";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Project } from "./Project";

export class AutomationRule extends Model {
  static override tableName = "automation_rules";

  static override get jsonAttributes() {
    return ["on", "if", "then"];
  }

  static get schema() {
    return z.object({
      active: z.boolean(),
      name: z.string().min(3).max(100),
      projectId: z.string(),
      on: z.array(AutomationEventSchema),
      if: z.object({
        all: z.array(AutomationConditionSchema),
      }),
      then: z.array(AutomationActionSchema),
    });
  }

  static override get jsonSchema() {
    return {
      allOf: [
        timestampsSchema,
        z.toJSONSchema(AutomationRule.schema, { io: "input" }) as JSONSchema,
      ],
    };
  }

  active!: z.infer<typeof AutomationRule.schema>["active"];
  name!: z.infer<typeof AutomationRule.schema>["name"];
  projectId!: z.infer<typeof AutomationRule.schema>["projectId"];
  on!: z.infer<typeof AutomationRule.schema>["on"];
  if!: z.infer<typeof AutomationRule.schema>["if"];
  then!: z.infer<typeof AutomationRule.schema>["then"];

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
