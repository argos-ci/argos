import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Subscription } from "./Subscription";
import { User } from "./User";

/**
 * A staff member reaching out to a team after it canceled a subscription.
 *
 * Apart from `StaffTeamContact`, which records the onboarding reach-out: a team
 * welcomed during its trial still has to be written to once it leaves, and
 * sharing one mark would show it as already contacted.
 */
export class StaffCancellationContact extends Model {
  static override tableName = "staff_cancellation_contacts";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object" as const,
        required: ["subscriptionId", "userId"],
        properties: {
          subscriptionId: { type: "string" },
          userId: { type: "string" },
        },
      },
    ],
  };

  subscriptionId!: string;
  userId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      subscription: {
        relation: Model.BelongsToOneRelation,
        modelClass: Subscription,
        join: {
          from: "staff_cancellation_contacts.subscriptionId",
          to: "subscriptions.id",
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: { from: "staff_cancellation_contacts.userId", to: "users.id" },
      },
    };
  }

  subscription?: Subscription;
  user?: User;
}
