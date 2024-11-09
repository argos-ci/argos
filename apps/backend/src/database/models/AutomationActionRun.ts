import { AutomationAction } from "@/automation/index.js";

import { Model } from "../util/model.js";
import { JobStatus } from "../util/schemas.js";
import { AutomationRun } from "./AutomationRun.js";

export class AutomationActionRun extends Model {
  static override tableName = "automation_action_runs";

  static override jsonSchema = {
    type: "object",
    required: ["jobStatus", "automationRunId", "action", "actionPayload"],
    properties: {
      attempts: { type: "integer", default: 0 },
      jobStatus: {
        type: "string",
        enum: ["pending", "progress", "complete", "error", "aborted"],
      },
      conclusion: {
        type: ["string", "null"],
        enum: ["success", "failed", null],
      },
      failureReason: { type: ["string", "null"] },
      automationRunId: { type: "string" },
      action: { type: "string" },
      actionPayload: { type: "object" },
      processedAt: { type: ["string", "null"] },
      completedAt: { type: ["string", "null"] },
    },
  };

  jobStatus!: JobStatus;
  conclusion!: "success" | "failed" | null;
  failureReason!: string | null;
  automationRunId!: string;
  action!: AutomationAction["type"];
  actionPayload!: AutomationAction["payload"];
  processedAt!: string | null;
  attempts!: number;
  completedAt!: string | null;

  static override relationMappings = {
    automationRun: {
      relation: Model.BelongsToOneRelation,
      modelClass: AutomationRun,
      join: {
        from: "automation_action_runs.automationRunId",
        to: "automation_runs.id",
      },
    },
  };

  automationRun?: AutomationRun;
}
