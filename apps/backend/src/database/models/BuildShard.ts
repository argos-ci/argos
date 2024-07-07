import type { RelationMappings } from "objection";

import {
  BuildMetadata,
  BuildMetadataJsonSchema,
} from "../services/buildMetadata.js";
import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Build } from "./Build.js";
import { Screenshot } from "./Screenshot.js";

export class BuildShard extends Model {
  static override tableName = "build_shards";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["buildId"],
    properties: {
      buildId: { type: "string" },
      index: { type: ["integer", "null"] },
      metadata: BuildMetadataJsonSchema,
    },
  });

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
