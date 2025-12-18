import type * as Bolt from "@slack/bolt";
import { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Account } from "./Account";
import { SlackChannel } from "./SlackChannel";

export class SlackInstallation extends Model {
  static override tableName = "slack_installations";

  static override get jsonAttributes() {
    return ["installation"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: [
          "installation",
          "teamId",
          "teamDomain",
          "teamName",
          "connectedAt",
        ],
        properties: {
          teamId: { type: "string" },
          teamDomain: { type: "string" },
          teamName: { type: "string" },
          installation: { type: "object" },
          connectedAt: { type: "string" },
        },
      },
    ],
  };

  teamId!: string;
  teamDomain!: string;
  teamName!: string;
  installation!: Bolt.Installation;
  connectedAt!: string;

  static override get relationMappings(): RelationMappings {
    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "accounts.slackInstallationId",
          to: "slack_installations.id",
        },
      },
      channels: {
        relation: Model.HasManyRelation,
        modelClass: SlackChannel,
        join: {
          from: "slack_installations.id",
          to: "slack_channels.slackInstallationId",
        },
      },
    };
  }

  account?: Account | null;
}
