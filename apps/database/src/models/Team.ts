import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { TeamUser } from "./TeamUser.js";
import type { User } from "./User.js";

export class Team extends Model {
  static override tableName = "teams";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["slug"],
    properties: {
      name: { type: ["string", "null"] },
      slug: { type: "string" },
      githubAccountId: { type: "string" },
    },
  });

  name!: string | null;
  slug!: string;
  githubAccountId!: string;

  type() {
    return "team";
  }

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
