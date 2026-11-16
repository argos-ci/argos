import {
  PROJECT_EVENTS,
  type ProjectEventName,
} from "@argos/schemas/project-event";
import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Account } from "./Account";
import { Project } from "./Project";

/**
 * An endpoint an account registers to receive its projects' events, each
 * request signed with the webhook's secret.
 */
export class Webhook extends Model {
  static override tableName = "webhooks";

  static override encryptedAttributes = ["url", "secret"];

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["accountId", "url", "secret", "events", "allProjects"],
        properties: {
          accountId: { type: "string" },
          url: { type: "string" },
          secret: { type: "string" },
          events: {
            type: "array",
            items: { type: "string", enum: PROJECT_EVENTS },
            minItems: 1,
            uniqueItems: true,
          },
          allProjects: { type: "boolean" },
        },
      },
    ],
  };

  accountId!: string;
  url!: string;
  secret!: string;
  events!: ProjectEventName[];
  allProjects!: boolean;

  static override get jsonAttributes() {
    return ["events"];
  }

  static override get relationMappings(): RelationMappings {
    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "webhooks.accountId",
          to: "accounts.id",
        },
      },
      projects: {
        relation: Model.ManyToManyRelation,
        modelClass: Project,
        join: {
          from: "webhooks.id",
          through: {
            from: "webhook_projects.webhookId",
            to: "webhook_projects.projectId",
          },
          to: "projects.id",
        },
      },
    };
  }

  account?: Account;
  projects?: Project[];
}
