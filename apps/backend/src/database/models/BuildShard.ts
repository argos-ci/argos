import type { JSONSchema, RelationMappings } from "objection";

import {
  BuildMetadata,
  BuildMetadataJsonSchema,
} from "../schemas/BuildMetadata";
import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Artifact } from "./Artifact";
import { Build } from "./Build";

export class BuildShard extends Model {
  static override tableName = "build_shards";

  static override get jsonAttributes() {
    return ["metadata"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["buildId"],
        properties: {
          buildId: { type: "string" },
          index: { type: ["integer", "null"] },
          metadata: {
            anyOf: [BuildMetadataJsonSchema as JSONSchema, { type: "null" }],
          },
        },
      },
    ],
  };

  buildId!: string;
  index!: number | null;
  metadata!: BuildMetadata | null;

  static override get relationMappings(): RelationMappings {
    return {
      build: {
        relation: Model.BelongsToOneRelation,
        modelClass: Build,
        join: {
          from: "build_shards.buildId",
          to: "builds.id",
        },
      },
      artifacts: {
        relation: Model.HasManyRelation,
        modelClass: Artifact,
        join: {
          from: "build_shards.id",
          to: "artifacts.buildShardId",
        },
      },
    };
  }

  build?: Build;
  artifacts?: Artifact[];
}
