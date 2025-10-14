import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { timestampsSchema } from "../util/schemas.js";
import { Artifact } from "./Artifact.js";
import { ArtifactDiff } from "./ArtifactDiff.js";
import { Project } from "./Project.js";

export class Test extends Model {
  static override tableName = "tests";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["name", "projectId", "buildName"],
        properties: {
          name: { type: "string", maxLength: 1024 },
          projectId: { type: "string" },
          buildName: { type: "string", maxLength: 255 },
        },
      },
    ],
  };

  name!: string;
  projectId!: string;
  buildName!: string;

  static override get relationMappings(): RelationMappings {
    return {
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: Project,
        join: {
          from: "tests.projectId",
          to: "projects.id",
        },
      },
      artifcats: {
        relation: Model.HasManyRelation,
        modelClass: Artifact,
        join: {
          from: "tests.id",
          to: "artifacts.testId",
        },
      },
      artifactDiffs: {
        relation: Model.HasManyRelation,
        modelClass: ArtifactDiff,
        join: {
          from: "tests.id",
          to: "artifact_diffs.testId",
        },
      },
    };
  }

  project?: Project;
  artifactDiffs?: ArtifactDiff[];
  artifacts?: Artifact[];
}
