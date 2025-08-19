import type { JSONSchema } from "objection";

import { AutomatedActionJSONSchema } from "@/automation/actions/index.js";

import { Model } from "../util/model.js";
import {
  jobModelSchema,
  JobStatus,
  timestampsSchema,
} from "../util/schemas.js";
import { AutomationRun } from "./AutomationRun.js";

export class AutomationActionRun extends Model {
  static override tableName = "automation_action_runs";

  static override get jsonSchema() {
    return {
      allOf: [
        timestampsSchema,
        jobModelSchema,
        {
          type: "object",
          required: ["automationRunId", "action", "actionPayload"],
          properties: {
            conclusion: {
              oneOf: [
                { type: "string", enum: ["success", "failed"] },
                { type: "null" },
              ],
            },
            failureReason: { type: ["string", "null"] },
            automationRunId: { type: "string" },
            processedAt: { type: ["string", "null"] },
            completedAt: { type: ["string", "null"] },
          },
        },
        AutomatedActionJSONSchema as JSONSchema,
      ],
    };
  }

  conclusion!: "success" | "failed" | null;
  failureReason!: string | null;
  automationRunId!: string;
  action!: string;
  actionPayload!: object;
  processedAt!: string | null;
  completedAt!: string | null;
  jobStatus!: JobStatus;

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
