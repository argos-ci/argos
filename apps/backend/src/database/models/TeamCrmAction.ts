import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Subscription } from "./Subscription";
import { Team } from "./Team";
import { User } from "./User";

const TEAM_CRM_ACTION_TYPES = [
  /** A staff member wrote to a team trying Argos. Once per team. */
  "trial_outreach",
  /** A staff member wrote to a team about its cancellation. Once per subscription. */
  "cancellation_follow_up",
] as const;

export type TeamCrmActionType = (typeof TEAM_CRM_ACTION_TYPES)[number];

/**
 * Something staff did with a customer: an email, a follow-up. One table for
 * every kind, told apart by `type`, so a new kind of action is a new type
 * rather than a new column, and the history of a team reads in one place.
 */
export class TeamCrmAction extends Model {
  static override tableName = "team_crm_actions";

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
          type: { type: "string", enum: [...TEAM_CRM_ACTION_TYPES] },
          note: { type: ["string", "null"] },
        },
      },
    ],
  };

  teamId!: string;
  /** The staff member who acted. Null when unknown, or once they are deleted. */
  userId!: string | null;
  /** The subscription the action is about, when it is about one. */
  subscriptionId!: string | null;
  type!: TeamCrmActionType;
  note!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      team: {
        relation: Model.BelongsToOneRelation,
        modelClass: Team,
        join: { from: "team_crm_actions.teamId", to: "teams.id" },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: { from: "team_crm_actions.userId", to: "users.id" },
      },
      subscription: {
        relation: Model.BelongsToOneRelation,
        modelClass: Subscription,
        join: {
          from: "team_crm_actions.subscriptionId",
          to: "subscriptions.id",
        },
      },
    };
  }

  team?: Team;
  user?: User | null;
  subscription?: Subscription | null;
}
