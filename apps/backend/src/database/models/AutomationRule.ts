import { z } from "zod";

import { AutomationActionSchema } from "@/automation/actions/index.js";
import { AutomationConditionSchema } from "@/automation/types/conditions.js";
import { AutomationEventSchema } from "@/automation/types/events.js";
import { zodToJsonSchema } from "@/util/zod.js";

import { Model } from "../util/model.js";
import { timestampsSchema } from "../util/schemas.js";
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
        zodToJsonSchema(AutomationRule.schema, {
          removeAdditionalStrategy: "strict",
        }),
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
