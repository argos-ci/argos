import { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { timestampsSchema } from "../util/schemas.js";
import { SlackInstallation } from "./SlackInstallation.js";

export class SlackChannel extends Model {
  static override tableName = "slack_channels";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["slackId", "name", "slackInstallationId"],
        properties: {
          slackId: { type: "string" },
          name: { type: "string" },
          slackInstallationId: { type: "string" },
          archived: { type: "boolean" },
        },
      },
    ],
  };

  slackId!: string;
  name!: string;
  slackInstallationId!: string;
  archived!: boolean;

  static override get relationMappings(): RelationMappings {
    return {
      slackInstallation: {
        relation: Model.BelongsToOneRelation,
        modelClass: SlackInstallation,
        join: {
          from: "slack_channels.slackInstallationId",
          to: "slack_installations.id",
        },
      },
    };
  }

  slackInstallation?: SlackInstallation;
}
