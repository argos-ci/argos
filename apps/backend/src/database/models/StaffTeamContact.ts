import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Team } from "./Team";
import { User } from "./User";

/**
 * A staff member reaching out to a new team.
 *
 * Kept as its own row rather than a timestamp on the account: a contact is an
 * event with an author, and the account table has no business holding
 * relationship data.
 */
export class StaffTeamContact extends Model {
  static override tableName = "staff_team_contacts";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object" as const,
        required: ["teamId", "userId"],
        properties: {
          teamId: { type: "string" },
          userId: { type: "string" },
        },
      },
    ],
  };

  teamId!: string;
  userId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      team: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: { from: "staff_team_contacts.teamId", to: "teams.id" },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: { from: "staff_team_contacts.userId", to: "users.id" },
      },
    };
  }

  team?: Team;
  user?: User;
}
