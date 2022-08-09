import { Model, mergeSchemas, timestampsSchema } from "../util";
import { Account } from "./Account";
import { Organization } from "./Organization";
import { Plan } from "./Plan";
import { User } from "./User";

export class Purchase extends Model {
  static get tableName() {
    return "purchases";
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
      required: ["accountId", "planId"],
      properties: {
        accountId: { type: ["string", null] },
        planId: { type: ["string", null] },
      },
    });
  }

  static get relationMappings() {
    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "purchases.accountId",
          to: "account.id",
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "purchases.accountId",
          through: {
            from: "account.id",
            to: "account.userId",
          },
          to: "user.id",
        },
      },
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: Organization,
        join: {
          from: "purchases.accountId",
          through: {
            from: "account.id",
            to: "account.organizationId",
          },
          to: "organization.id",
        },
      },
      plan: {
        relation: Model.BelongsToOneRelation,
        modelClass: Plan,
        join: {
          from: "purchases.planId",
          to: "plan.id",
        },
      },
    };
  }
}
