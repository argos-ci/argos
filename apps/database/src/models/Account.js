import { Model, mergeSchemas, timestampsSchema } from "../util";
import { Organization } from "./Organization";
import { Plan } from "./Plan";
import { Purchase } from "./Purchase";
import { Screenshot } from "./Screenshot";
import { User } from "./User";

export class Account extends Model {
  static get tableName() {
    return "accounts";
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
      required: [],
      properties: {
        userId: { type: ["string", null] },
        organizationId: { type: ["string", null] },
      },
    });
  }

  static get relationMappings() {
    return {
      user: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: "accounts.userId",
          to: "users.id",
        },
      },
      organization: {
        relation: Model.HasOneRelation,
        modelClass: Organization,
        join: {
          from: "accounts.organizationId",
          to: "organizations.id",
        },
      },
    };
  }

  async getActivePurchase() {
    const purchase = await Purchase.query()
      .where("accountId", this.id)
      .where("startDate", "<", "now()")
      .where((query) =>
        query.whereNull("endDate").orWhere("endDate", ">=", "now()")
      )
      .withGraphFetched("plan")
      .first();

    return purchase || null;
  }

  async screenshotsMonthlyLimit() {
    const purchase = await this.getActivePurchase();
    if (purchase) {
      return purchase.plan.screenshotsMonthlyLimit;
    }

    const freePlan = await Plan.getFreePlan();
    return freePlan.screenshotsMonthlyLimit;
  }

  async getCurrentConsumptionStartDate() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const activePurchase = await this.getActivePurchase();
    if (!activePurchase) {
      return startOfMonth;
    }

    const startOfSecondMonth = new Date(
      activePurchase.startDate.getFullYear(),
      activePurchase.startDate.getMonth() + 1,
      1
    );
    return now < startOfSecondMonth ? activePurchase.startDate : startOfMonth;
  }

  async getScreenshotsCurrentConsumption() {
    const startDate = await this.getCurrentConsumptionStartDate();
    const query = Screenshot.query()
      .joinRelated("screenshotBucket.repository")
      .where("screenshotBucket:repository.private", "true")
      .where("screenshots.createdAt", ">=", startDate);

    if (this.userId) {
      query.where("screenshotBucket:repository.userId", this.userId);
    } else {
      query.where(
        "screenshotBucket:repository.organizationId",
        this.organizationId
      );
    }

    // console.log(query.toKnexQuery().toString());
    return query.resultSize();
  }
}
