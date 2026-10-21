import { TeamUserLevelSchema } from "@argos/schemas/team-user-level";
import type { RelationMappings } from "objection";
import { z } from "zod";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Team } from "./Team";
import { User } from "./User";

/**
 * A user provisioned in a team by its Identity Provider through SCIM.
 *
 * It holds the attributes the IdP sent, echoed back as-is, whether the IdP
 * wants the user `active`, which decides the team membership, and the `role`
 * it assigns, which sets the member's level when there is one. The Argos user
 * it points to is linked once, at creation, and never follows a later email
 * change: the account belongs to the person, not to the team.
 */
export class TeamScimUser extends Model {
  static override tableName = "team_scim_users";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["teamId", "userId", "userName", "active"],
        properties: {
          teamId: { type: "string" },
          userId: { type: "string" },
          userName: { type: "string", minLength: 1, maxLength: 255 },
          externalId: { type: ["string", "null"], maxLength: 255 },
          email: { type: ["string", "null"], maxLength: 255 },
          displayName: { type: ["string", "null"], maxLength: 255 },
          givenName: { type: ["string", "null"], maxLength: 255 },
          familyName: { type: ["string", "null"], maxLength: 255 },
          active: { type: "boolean" },
          role: {
            type: ["string", "null"],
            enum: [...TeamUserLevelSchema.options, null],
          },
        },
      },
    ],
  };

  teamId!: string;
  userId!: string;
  userName!: string;
  externalId!: string | null;
  email!: string | null;
  displayName!: string | null;
  givenName!: string | null;
  familyName!: string | null;
  active!: boolean;
  role!: z.infer<typeof TeamUserLevelSchema> | null;

  static override get relationMappings(): RelationMappings {
    return {
      team: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: {
          from: "team_scim_users.teamId",
          to: "teams.id",
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "team_scim_users.userId",
          to: "users.id",
        },
      },
    };
  }

  team?: Team;
  user?: User;
}
