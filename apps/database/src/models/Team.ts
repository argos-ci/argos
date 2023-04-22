import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Account } from "./Account.js";
import { TeamUser } from "./TeamUser.js";
import { User } from "./User.js";

export class Team extends Model {
  static override tableName = "teams";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: [],
  });

  static override get relationMappings(): RelationMappings {
    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "teams.id",
          to: "accounts.teamId",
        },
      },
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: "teams.id",
          through: {
            from: "team_users.teamId",
            to: "team_users.userId",
          },
          to: "users.id",
        },
      },
    };
  }

  account?: Account;
  users?: User[];

  async $checkWritePermission(user: User) {
    return Team.checkWritePermission(this.id, user);
  }

  static async checkWritePermission(teamId: string, user: User) {
    if (!user) return false;
    const teamUser = await TeamUser.query()
      .select("id")
      .where({ userId: user.id, teamId: teamId })
      .first();
    return Boolean(teamUser);
  }
}
