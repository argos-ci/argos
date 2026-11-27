import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Subscription } from "./Subscription";
import { Team } from "./Team";
import { User } from "./User";

const TEAM_OUTREACH_TYPES = [
  /** A staff member wrote to a team trying Argos. Once per team. */
  "trial",
  /** A staff member wrote to a team about its cancellation. Once per subscription. */
  "cancellation",
  /** A staff member offered Enterprise to a Pro team. Once per subscription. */
  "enterprise_offer",
  /** A staff member wrote about renewing an annual contract. Every term. */
  "enterprise_renewal",
] as const;

export type TeamOutreachType = (typeof TEAM_OUTREACH_TYPES)[number];

/**
 * An email staff sent a team: a welcome to a trial, a follow-up on a
 * cancellation. One table for every kind, told apart by `type`, so a new kind
 * of email is a new type rather than a new column, and what was sent to a team
 * reads in one place.
 */
export class TeamOutreach extends Model {
  static override tableName = "team_outreach";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object" as const,
        required: ["teamId", "type"],
        properties: {
          teamId: { type: "string" },
          userId: { type: ["string", "null"] },
          subscriptionId: { type: ["string", "null"] },
          type: { type: "string", enum: [...TEAM_OUTREACH_TYPES] },
          note: { type: ["string", "null"] },
        },
      },
    ],
  };

  teamId!: string;
  /** The staff member who wrote. Null when unknown, or once they are deleted. */
  userId!: string | null;
  /** The subscription the email is about, when it is about one. */
  subscriptionId!: string | null;
  type!: TeamOutreachType;
  note!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      team: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: { from: "team_outreach.teamId", to: "teams.id" },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: { from: "team_outreach.userId", to: "users.id" },
      },
      subscription: {
        relation: Model.BelongsToOneRelation,
        modelClass: Subscription,
        join: {
          from: "team_outreach.subscriptionId",
          to: "subscriptions.id",
        },
      },
    };
  }

  team?: Team;
  user?: User | null;
  subscription?: Subscription | null;
}
