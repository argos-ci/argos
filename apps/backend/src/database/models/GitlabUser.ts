import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { User } from "./User.js";

export class GitlabUser extends Model {
  static override tableName = "gitlab_users";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: [
      "name",
      "email",
      "username",
      "gitlabId",
      "accessToken",
      "accessTokenExpiresAt",
      "refreshToken",
    ],
    properties: {
      name: { type: "string" },
      email: { type: "string" },
      username: { type: "string" },
      gitlabId: { type: "number" },
      accessToken: { type: "string" },
      accessTokenExpiresAt: { type: "string" },
      refreshToken: { type: "string" },
      lastLoggedAt: { type: ["string", "null"] },
    },
  });

  name!: string;
  email!: string;
  username!: string;
  gitlabId!: number;
  accessToken!: string;
  accessTokenExpiresAt!: string;
  refreshToken!: string;
  lastLoggedAt!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "gitlab_users.id",
          to: "users.gitlabUserId",
        },
      },
    };
  }

  user?: User;
}
