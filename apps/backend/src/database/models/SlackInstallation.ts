import type Bolt from "@slack/bolt";
import { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { timestampsSchema } from "../util/schemas.js";
import { Account } from "./Account.js";

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
        required: ["installation", "teamId", "teamDomain", "teamName"],
        properties: {
          teamId: { type: "string" },
          teamDomain: { type: "string" },
          teamName: { type: "string" },
          installation: { type: "object" },
        },
      },
    ],
  };

  teamId!: string;
  teamDomain!: string;
  teamName!: string;
  installation!: Bolt.Installation;

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
    };
  }

  account?: Account | null;
}
