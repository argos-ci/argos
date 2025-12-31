import {
  AutomationEvent,
  AutomationEvents,
} from "@argos/schemas/automation-event";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { AutomationRule } from "./AutomationRule";
import { Build } from "./Build";
import { BuildReview } from "./BuildReview";

export class AutomationRun extends Model {
  static override tableName = "automation_runs";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["automationRuleId", "event"],
        properties: {
          buildId: { type: ["string", "null"] },
          buildReviewId: { type: ["string", "null"] },
          event: {
            type: "string",
            enum: Object.values(AutomationEvents),
          },
          automationRuleId: { type: "string" },
        },
      },
    ],
  };

  automationRuleId!: string;
  event!: AutomationEvent;
  buildId?: string | null;
  buildReviewId?: string | null;

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
    buildReview: {
      relation: Model.BelongsToOneRelation,
      modelClass: BuildReview,
      join: {
        from: "automation_runs.buildReviewId",
        to: "build_reviews.id",
      },
    },
  };

  automationRule?: AutomationRule;
  build?: Build;
  buildReview?: BuildReview;
}
