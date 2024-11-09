import {
  AutomationEvent,
  AutomationEvents,
} from "@/automation/types/events.js";

import { Model } from "../util/model.js";
import {
  jobModelSchema,
  JobStatus,
  timestampsSchema,
} from "../util/schemas.js";
import { AutomationRule } from "./AutomationRule.js";
import { Build } from "./Build.js";
import { BuildReview } from "./BuildReview.js";

export class AutomationRun extends Model {
  static override tableName = "automation_runs";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      jobModelSchema,
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
  jobStatus!: JobStatus;

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
    buildReviewModel: {
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
