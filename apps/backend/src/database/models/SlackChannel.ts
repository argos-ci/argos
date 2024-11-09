import { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { SlackInstallation } from "./SlackInstallation.js";

export class SlackChannel extends Model {
  static override tableName = "slack_channels";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["slackId", "name", "slackInstallationId"],
    properties: {
      slackId: { type: "string" },
      name: { type: "string" },
      slackInstallationId: { type: "string" },
    },
  });

  slackId!: string;
  name!: string;
  slackInstallationId!: string;

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
