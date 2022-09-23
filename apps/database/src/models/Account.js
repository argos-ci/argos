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
      purchases: {
        relation: Model.HasManyRelation,
        modelClass: Purchase,
        join: {
          from: "accounts.id",
          to: "purchases.accountId",
        },
      },
    };
  }

  static get virtualAttributes() {
    return ["type"];
  }

  get type() {
    if (this.userId && this.organizationId) {
      throw new Error(`Invariant incoherent account type`);
    }
    if (this.userId) return "user";
    if (this.organizationId) return "organization";
    throw new Error(`Invariant incoherent account type`);
  }

  async getActivePurchase() {
    if (!this.id) return null;

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

  async getPlan() {
    const activePurchase = await this.getActivePurchase();
    if (activePurchase) return activePurchase.plan;
    const freePlan = await Plan.getFreePlan();
    return freePlan || null;
  }

  async getScreenshotsMonthlyLimit() {
    const plan = await this.getPlan();
    return plan ? plan.screenshotsMonthlyLimit : null;
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

    return query.resultSize();
  }

  async getScreenshotsConsumptionRatio() {
    const screenshotsCurrentConsumption =
      await this.getScreenshotsCurrentConsumption();
    const screenshotsMonthlyLimit = await this.getScreenshotsMonthlyLimit();
    return screenshotsMonthlyLimit
      ? screenshotsCurrentConsumption / screenshotsMonthlyLimit
      : null;
  }

  async hasExceedScreenshotsMonthlyLimit() {
    const screenshotsConsumptionRatio =
      await this.getScreenshotsConsumptionRatio();
    if (!screenshotsConsumptionRatio) return false;
    return screenshotsConsumptionRatio >= 1.1;
  }

  static async getAccount({ userId, organizationId }) {
    if (userId) {
      const userAccount = await Account.query()
        .findOne("userId", userId)
        .withGraphFetched("user");
      return userAccount || Account.fromJson({ userId });
    }

    if (organizationId) {
      const organizationAccount = await Account.query()
        .findOne("organizationId", organizationId)
        .withGraphFetched("organization")
        .first();
      return organizationAccount || Account.fromJson({ organizationId });
    }

    throw new Error("Can't get account without userId or organizationId");
  }
}
