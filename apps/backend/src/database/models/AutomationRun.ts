import { AutomationEvent } from "@/automation/index.js";

import { Model } from "../util/model.js";
import { AutomationRule } from "./AutomationRule.js";
import { Build } from "./Build.js";
import { BuildReview } from "./BuildReview.js";

export class AutomationRun extends Model {
  static override tableName = "automation_runs";

  static override jsonSchema = {
    type: "object",
    required: ["automationRuleId", "event"],
    properties: {
      buildId: { type: ["string", "null"] },
      event: { type: "string" },
      automationRuleId: { type: "string" },
    },
  };

  automationRuleId!: string;
  event!: AutomationEvent;
  buildId?: string | null;

  static override relationMappings = {
    automationRule: {
      relation: Model.BelongsToOneRelation,
      modelClass: AutomationRule,
      join: {
        from: "automation_runs.automationRuleId",
        to: "automation_rules.id",
      },
    },
    build: {
      relation: Model.BelongsToOneRelation,
      modelClass: Build,
      join: {
        from: "automation_runs.buildId",
        to: "builds.id",
      },
    },
  };

  automationRule?: AutomationRule;
  build?: Build;
  buildReview?: BuildReview;
}
