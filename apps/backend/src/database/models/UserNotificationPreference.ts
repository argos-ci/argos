import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { User } from "./User";

/**
 * Stores a user's deviations from the default notification settings.
 *
 * Notifications are enabled by default, so a row only exists when a user has
 * overridden the default for a given (category, channel) pair. The absence of
 * a row means "use the default".
 */
export class UserNotificationPreference extends Model {
  static override tableName = "user_notification_preferences";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["userId", "category", "channel", "enabled"],
        properties: {
          userId: { type: "string" },
          category: { type: "string" },
          channel: { type: "string" },
          enabled: { type: "boolean" },
        },
      },
    ],
  };

  userId!: string;
  category!: string;
  channel!: string;
  enabled!: boolean;

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "user_notification_preferences.userId",
          to: "users.id",
        },
      },
    };
  }

  user?: User;
}
