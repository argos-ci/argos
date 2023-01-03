import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Organization } from "./Organization.js";
import { Plan } from "./Plan.js";
import { Purchase } from "./Purchase.js";
import { Screenshot } from "./Screenshot.js";
import { User } from "./User.js";

export class Account extends Model {
  static override tableName = "accounts";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: [],
    properties: {
      userId: { type: ["string", "null"] },
      organizationId: { type: ["string", "null"] },
      forcedPlanId: { type: ["string", "null"] },
      stripeCustomerId: { type: ["string", "null"] },
    },
  });

  userId!: string | null;
  organizationId!: string | null;
  forcedPlanId!: string | null;

  static override get relationMappings(): RelationMappings {
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

  user?: User | null;
  organization?: Organization | null;
  purchases?: Purchase[];
  stripeCustomerId?: string | null;

  static override virtualAttributes = ["type"];

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
      .joinRelated("plan")
      .orderBy("screenshotsLimitPerMonth", "DESC")
      .first();

    return purchase ?? null;
  }

  async getPlan(): Promise<Plan | null> {
    if (this.forcedPlanId) {
      const plan = await Plan.query().findById(this.forcedPlanId);
      return plan ?? null;
    }

    const activePurchase = await this.getActivePurchase();
    if (activePurchase) {
      const plan = await activePurchase.$relatedQuery("plan");
      return plan;
    }
    return Plan.getFreePlan();
  }

  async getLogin(): Promise<string> {
    switch (this.type) {
      case "organization": {
        if (this.organization) return this.organization.login;
        const organization = (await Organization.query()
          .select("login")
          .findOne({ id: this.organizationId })) as Organization;
        return organization.login;
      }
      case "user": {
        if (this.user) return this.user.login;
        const user = (await User.query()
          .select("login")
          .findOne({ id: this.userId })) as User;
        return user.login;
      }
      default:
        throw new Error(`Invariant incoherent account type`);
    }
  }

  async getScreenshotsMonthlyLimit() {
    const plan = await this.getPlan();
    return plan ? plan.screenshotsLimitPerMonth : null;
  }

  async getCurrentConsumptionStartDate() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (this.forcedPlanId) {
      return startOfMonth;
    }

    const activePurchase = await this.getActivePurchase();

    if (!activePurchase || !activePurchase.startDate) {
      return startOfMonth;
    }

    const purchaseStartDate = new Date(activePurchase.startDate);

    const startOfSecondMonth = new Date(
      purchaseStartDate.getFullYear(),
      purchaseStartDate.getMonth() + 1,
      1
    );
    return now < startOfSecondMonth ? purchaseStartDate : startOfMonth;
  }

  async getScreenshotsCurrentConsumption() {
    const startDate = await this.getCurrentConsumptionStartDate();
    const query = Screenshot.query()
      .joinRelated("screenshotBucket.repository")
      .where("screenshots.createdAt", ">=", startDate)
      .where((builder) =>
        builder
          .where("screenshotBucket:repository.private", "true")
          .orWhere("screenshotBucket:repository.forcedPrivate", "true")
      );

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
    const screenshotsMonthlyLimit = await this.getScreenshotsMonthlyLimit();
    if (!screenshotsMonthlyLimit) return null;
    if (screenshotsMonthlyLimit === -1) return 0;
    const screenshotsCurrentConsumption =
      await this.getScreenshotsCurrentConsumption();
    return screenshotsCurrentConsumption / screenshotsMonthlyLimit;
  }

  async hasExceedScreenshotsMonthlyLimit() {
    const screenshotsConsumptionRatio =
      await this.getScreenshotsConsumptionRatio();
    if (!screenshotsConsumptionRatio) return false;
    return screenshotsConsumptionRatio >= 1.1;
  }

  static async getAccount({
    userId,
    organizationId,
  }: {
    userId?: string | null;
    organizationId?: string | null;
  }) {
    if (userId && organizationId) {
      throw new Error(
        `Can't call getAccount with both userId and organizationId`
      );
    }
    if (userId) {
      const userAccount = await Account.query()
        .withGraphFetched("user")
        .findOne("userId", userId);
      return userAccount || Account.fromJson({ userId });
    }

    if (organizationId) {
      const organizationAccount = await Account.query()
        .withGraphFetched("organization")
        .findOne("organizationId", organizationId);
      return organizationAccount || Account.fromJson({ organizationId });
    }

    throw new Error("Can't get account without userId or organizationId");
  }

  static async getOrCreateAccount(options: {
    userId?: string;
    organizationId?: string;
  }) {
    const account = await this.getAccount(options);
    if (account.id) return account;
    return account.$query().insertAndFetch();
  }
}
