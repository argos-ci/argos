import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Plan } from "./Plan.js";
import { Purchase } from "./Purchase.js";
import { Screenshot } from "./Screenshot.js";
import { Team } from "./Team.js";
import { User } from "./User.js";

export class Account extends Model {
  static override tableName = "accounts";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: [],
    properties: {
      userId: { type: ["string", "null"] },
      forcedPlanId: { type: ["string", "null"] },
      stripeCustomerId: { type: ["string", "null"] },
      teamId: { type: ["string", "null"] },
    },
  });

  userId!: string | null;
  forcedPlanId!: string | null;
  teamId!: string | null;
  stripeCustomerId?: string | null;

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
      team: {
        relation: Model.HasOneRelation,
        modelClass: Team,
        join: {
          from: "accounts.teamId",
          to: "teams.id",
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
  team?: Team | null;
  purchases?: Purchase[];

  static override virtualAttributes = ["type"];

  get type() {
    if (this.userId && this.teamId) {
      throw new Error(`Invariant incoherent account type`);
    }
    if (this.userId) return "user";
    if (this.teamId) return "team";
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

  async getSlug(): Promise<string> {
    switch (this.type) {
      case "team": {
        if (this.team) return this.team.slug;
        const team = (await Team.query()
          .select("slug")
          .findOne({ id: this.teamId })) as Team;
        return team.slug;
      }
      case "user": {
        if (this.user) return this.user.slug;
        const user = (await User.query()
          .select("slug")
          .findOne({ id: this.userId })) as User;
        return user.slug;
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
      .joinRelated("screenshotBucket.project.githubRepository")
      .where("screenshots.createdAt", ">=", startDate)
      .where("screenshotBucket.project.accountId", this.id)
      .where((builder) =>
        builder
          .where("screenshotBucket.project.githubRepository.private", true)
          .orWhere("screenshotBucket.project.private", true)
      );

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
    teamId,
  }: {
    userId?: string | null;
    teamId?: string | null;
  }) {
    if (userId && teamId) {
      throw new Error(`Can't call getAccount with both userId and teamId`);
    }
    if (userId) {
      const userAccount = await Account.query()
        .withGraphFetched("user")
        .findOne("userId", userId);
      return userAccount || Account.fromJson({ userId });
    }

    if (teamId) {
      const teamAccount = await Account.query()
        .withGraphFetched("team")
        .findOne("teamId", teamId);
      return teamAccount || Account.fromJson({ teamId });
    }

    throw new Error("Can't get account without userId or teamId");
  }

  static async getOrCreateAccount(options: {
    userId?: string;
    teamId?: string;
  }) {
    const account = await this.getAccount(options);
    if (account.id) return account;
    return account.$query().insertAndFetch();
  }

  async $checkWritePermission(user: User) {
    return Account.checkWritePermission(this, user);
  }

  static async checkWritePermission(account: Account, user: User) {
    if (!user) return false;
    switch (account.type) {
      case "user":
        return User.checkWritePermission(account.userId as string, user);
      case "team":
        return Team.checkWritePermission(account.teamId as string, user);
      default:
        throw new Error(`Invariant incoherent account type`);
    }
  }
}
