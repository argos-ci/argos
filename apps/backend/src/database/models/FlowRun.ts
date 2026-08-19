import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Build } from "./Build";
import { BuildShard } from "./BuildShard";
import { Flow } from "./Flow";
import { Screenshot } from "./Screenshot";

const FLOW_RUN_STATUSES = [
  "passed",
  "failed",
  "timedOut",
  "skipped",
  "interrupted",
] as const;

export type FlowRunStatus = (typeof FLOW_RUN_STATUSES)[number];

const FLOW_RUN_OUTCOMES = [
  "expected",
  "unexpected",
  "flaky",
  "skipped",
] as const;

export type FlowRunOutcome = (typeof FLOW_RUN_OUTCOMES)[number];

export type FlowRunAnnotation = {
  type: string;
  // Explicitly `| undefined`: the value comes straight from the report schema,
  // whose optional fields are inferred that way under
  // `exactOptionalPropertyTypes`.
  description?: string | undefined;
};

/**
 * One execution of a {@link Flow} in one build, under one runner project.
 *
 * A build that runs the same test under chromium and firefox produces two runs
 * of the same flow. `pwProject` is an empty string — never null — when the
 * runner has no project configured, so the `(buildId, flowId, pwProject)`
 * unique index actually rejects duplicates.
 */
export class FlowRun extends Model {
  static override tableName = "flow_runs";

  static override get jsonAttributes() {
    return ["tags", "annotations"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["buildId", "flowId", "pwProject", "status"],
        properties: {
          buildId: { type: "string" },
          flowId: { type: "string" },
          buildShardId: { type: ["string", "null"] },
          pwProject: { type: "string", maxLength: 255 },
          pwTestId: { type: ["string", "null"], maxLength: 255 },
          status: { type: "string", enum: [...FLOW_RUN_STATUSES] },
          outcome: {
            anyOf: [
              { type: "string", enum: [...FLOW_RUN_OUTCOMES] },
              { type: "null" },
            ],
          },
          duration: { type: ["number", "null"] },
          retry: { type: ["number", "null"] },
          line: { type: ["number", "null"] },
          tags: {
            anyOf: [
              { type: "array", items: { type: "string" } },
              { type: "null" },
            ],
          },
          annotations: {
            anyOf: [
              {
                type: "array",
                items: {
                  type: "object",
                  required: ["type"],
                  properties: {
                    type: { type: "string" },
                    description: { type: "string" },
                  },
                },
              },
              { type: "null" },
            ],
          },
        },
      },
    ],
  };

  buildId!: string;
  flowId!: string;
  buildShardId!: string | null;
  pwProject!: string;
  pwTestId!: string | null;
  status!: FlowRunStatus;
  outcome!: FlowRunOutcome | null;
  duration!: number | null;
  retry!: number | null;
  line!: number | null;
  tags!: string[] | null;
  annotations!: FlowRunAnnotation[] | null;

  static override get relationMappings(): RelationMappings {
    return {
      build: {
        relation: Model.BelongsToOneRelation,
        modelClass: Build,
        join: {
          from: "flow_runs.buildId",
          to: "builds.id",
        },
      },
      flow: {
        relation: Model.BelongsToOneRelation,
        modelClass: Flow,
        join: {
          from: "flow_runs.flowId",
          to: "flows.id",
        },
      },
      buildShard: {
        relation: Model.BelongsToOneRelation,
        modelClass: BuildShard,
        join: {
          from: "flow_runs.buildShardId",
          to: "build_shards.id",
        },
      },
      screenshots: {
        relation: Model.HasManyRelation,
        modelClass: Screenshot,
        join: {
          from: "flow_runs.id",
          to: "screenshots.flowRunId",
        },
      },
    };
  }

  build?: Build;
  flow?: Flow;
  buildShard?: BuildShard | null;
  screenshots?: Screenshot[];
}
