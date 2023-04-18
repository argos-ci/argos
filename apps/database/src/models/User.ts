import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Account } from "./Account.js";
import { Team } from "./Team.js";

export class User extends Model {
  static override tableName = "users";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["slug", "githubAccountId"],
    properties: {
      name: { type: ["string", "null"] },
      email: { type: ["string", "null"] },
      accessToken: { type: "string" },
      slug: { type: "string" },
      githubAccountId: { type: "string" },
    },
  });

  name!: string | null;
  email!: string | null;
  accessToken!: string;
  slug!: string;
  githubAccountId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "users.id",
          to: "accounts.userId",
        },
      },
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

  account?: Account;
  teams?: Team[];

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
