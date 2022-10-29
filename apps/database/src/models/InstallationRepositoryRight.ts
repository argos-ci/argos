import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Installation } from "./Installation.js";
import { Repository } from "./Repository.js";

export class InstallationRepositoryRight extends Model {
  static override tableName = "installation_repository_rights";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["installationId", "repositoryId"],
    properties: {
      installationId: { type: "string" },
      repositoryId: { type: "string" },
    },
  });

  installationId!: string;
  repositoryId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      installation: {
        relation: Model.BelongsToOneRelation,
        modelClass: Installation,
        join: {
          from: "installation_repository_rights.installationId",
          to: "installations.id",
        },
      },
      repository: {
        relation: Model.BelongsToOneRelation,
        modelClass: Repository,
        join: {
          from: "installation_repository_rights.repositoryId",
          to: "repositories.id",
        },
      },
    };
  }

  installation?: Installation;
  repository?: Repository;
}
