import { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Account } from "./Account";

export class DiscordWebhook extends Model {
  static override tableName = "discord_webhooks";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["accountId", "name", "url", "connectedAt"],
        properties: {
          accountId: { type: "string" },
          name: { type: "string", minLength: 1, maxLength: 255 },
          url: { type: "string" },
          connectedAt: { type: "string" },
        },
      },
    ],
  };

  accountId!: string;
  name!: string;
  url!: string;
  connectedAt!: string;

  static override get relationMappings(): RelationMappings {
    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "discord_webhooks.accountId",
          to: "accounts.id",
        },
      },
    };
  }

  account?: Account;
}
