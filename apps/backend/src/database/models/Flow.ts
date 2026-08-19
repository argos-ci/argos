import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { FlowRun } from "./FlowRun";
import { Project } from "./Project";

/**
 * An end-to-end test of a project, as the test runner reports it.
 *
 * The identity is the title path — file, describes, title — not the runner's
 * own test id, which is only unique within a run and changes when the runner
 * project is renamed. It is deliberately blind to the runner project
 * (chromium, firefox, a device): one test walked under three browsers is one
 * flow, run three times. See {@link FlowRun}.
 */
export class Flow extends Model {
  static override tableName = "flows";

  static override get jsonAttributes() {
    return ["titlePath"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: [
          "projectId",
          "buildName",
          "key",
          "file",
          "title",
          "titlePath",
          "lastSeenAt",
        ],
        properties: {
          projectId: { type: "string" },
          buildName: { type: "string", maxLength: 255 },
          key: { type: "string", maxLength: 1024 },
          file: { type: "string", maxLength: 1024 },
          title: { type: "string", maxLength: 1024 },
          titlePath: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
          },
          lastSeenAt: { type: "string" },
        },
      },
    ],
  };

  projectId!: string;
  buildName!: string;
  key!: string;
  file!: string;
  title!: string;
  titlePath!: string[];
  lastSeenAt!: string;

  static override get relationMappings(): RelationMappings {
    return {
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: Project,
        join: {
          from: "flows.projectId",
          to: "projects.id",
        },
      },
      runs: {
        relation: Model.HasManyRelation,
        modelClass: FlowRun,
        join: {
          from: "flows.id",
          to: "flow_runs.flowId",
        },
      },
    };
  }

  project?: Project;
  runs?: FlowRun[];
}
