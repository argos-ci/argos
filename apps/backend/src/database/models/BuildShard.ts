import {
  BuildMetadata,
  BuildMetadataJsonSchema,
} from "@argos/schemas/build-metadata";
import type { JSONSchema, RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Build } from "./Build";
import { Screenshot } from "./Screenshot";

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
      screenshots: {
        relation: Model.HasManyRelation,
        modelClass: Screenshot,
        join: {
          from: "build_shards.id",
          to: "screenshots.buildShardId",
        },
      },
    };
  }

  build?: Build;
  screenshots?: Screenshot[];
}
