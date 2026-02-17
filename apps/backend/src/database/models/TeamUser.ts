import { TeamUserLevelSchema } from "@argos/schemas/team-user-level";
import { RelationMappings, type JSONSchema } from "objection";
import { z } from "zod";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Team } from "./Team";
import { User } from "./User";

export class TeamUser extends Model {
  static override tableName = "team_users";

  static authMethods = ["email", "google", "github", "gitlab", "saml"] as const;

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["userId", "teamId", "userLevel"],
        properties: {
          userId: { type: "string" },
          teamId: { type: "string" },
          userLevel: z.toJSONSchema(TeamUserLevelSchema) as JSONSchema,
          ssoSubject: { type: ["string", "null"] },
          ssoVerifiedAt: { type: ["string", "null"] },
          lastAuthMethod: {
            type: ["string", "null"],
            enum: [...TeamUser.authMethods, null],
          },
        },
      },
    ],
  };

  userId!: string;
  teamId!: string;
  userLevel!: z.infer<typeof TeamUserLevelSchema>;
  ssoSubject!: string | null;
  ssoVerifiedAt!: string | null;
  lastAuthMethod!: (typeof TeamUser.authMethods)[number] | null;

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "team_users.userId",
          to: "users.id",
        },
      },
      team: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: {
          from: "team_users.teamId",
          to: "teams.id",
        },
      },
    };
  }

  user?: User | null;
  team?: Team | null;
}
