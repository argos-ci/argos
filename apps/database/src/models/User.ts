import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Team } from "./Team.js";

export class User extends Model {
  static override tableName = "users";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["githubId", "slug"],
    properties: {
      githubId: { type: "number" },
      name: { type: ["string", "null"] },
      email: { type: ["string", "null"] },
      accessToken: { type: "string" },
      slug: { type: "string" },
    },
  });

  githubId!: number;
  name!: string | null;
  email!: string | null;
  accessToken!: string;
  slug!: string;

  static override get relationMappings(): RelationMappings {
    return {
      teams: {
        relation: Model.ManyToManyRelation,
        modelClass: Team,
        join: {
          from: "users.id",
          through: {
            from: "team_users.userId",
            to: "team_users.teamId",
          },
          to: "teams.id",
        },
      },
    };
  }

  type() {
    return "user";
  }

  $checkWritePermission(user: User) {
    return User.checkWritePermission(this.id, user);
  }

  static checkWritePermission(userId: string, user: User) {
    if (!user) return false;
    return userId === user.id;
  }
}
