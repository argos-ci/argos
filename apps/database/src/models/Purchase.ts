import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Account } from "./Account.js";
import { Organization } from "./Organization.js";
import { Plan } from "./Plan.js";
import { User } from "./User.js";

export class Purchase extends Model {
  static override tableName = "purchases";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["accountId", "planId"],
    properties: {
      accountId: { type: ["string"] },
      planId: { type: ["string"] },
      endDate: { type: ["string", "null"] },
      startDate: { type: ["string", "null"] },
    },
  });

  accountId!: string;
  planId!: string;
  endDate!: string | null;
  startDate!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "purchases.accountId",
          to: "accounts.id",
        },
      },
      plan: {
        relation: Model.BelongsToOneRelation,
        modelClass: Plan,
        join: {
          from: "purchases.planId",
          to: "plans.id",
        },
      },
      user: {
        relation: Model.HasOneThroughRelation,
        modelClass: User,
        join: {
          from: "purchases.accountId",
          through: {
            from: "accounts.id",
            to: "accounts.userId",
          },
          to: "users.id",
        },
      },
      organization: {
        relation: Model.HasOneThroughRelation,
        modelClass: Organization,
        join: {
          from: "purchases.accountId",
          through: {
            from: "accounts.id",
            to: "accounts.organizationId",
          },
          to: "organizations.id",
        },
      },
    };
  }

  account?: Account;
  plan?: Plan;
  user?: User | null;
  organization?: Organization | null;
}
