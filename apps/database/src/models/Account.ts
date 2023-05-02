import type { Pojo, RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { GithubAccount } from "./GithubAccount.js";
import { Plan } from "./Plan.js";
import { Project } from "./Project.js";
import { Purchase } from "./Purchase.js";
import { Screenshot } from "./Screenshot.js";
import { Team } from "./Team.js";
import { User } from "./User.js";
import { VercelConfiguration } from "./VercelConfiguration.js";

export type AccountAvatar = {
  getUrl(args: { size?: number }): string | null;
  initial: string;
  color: string;
};

export class Account extends Model {
  static override tableName = "accounts";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["slug"],
    properties: {
      userId: { type: ["string", "null"] },
      forcedPlanId: { type: ["string", "null"] },
      stripeCustomerId: { type: ["string", "null"] },
      teamId: { type: ["string", "null"] },
      name: { type: ["string", "null"], maxLength: 40, minLength: 1 },
      slug: {
        type: "string",
        minLength: 1,
        maxLength: 48,
        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      },
      githubAccountId: { type: ["string", "null"] },
      vercelConfigurationId: { type: "string" },
    },
  });

  userId!: string | null;
  forcedPlanId!: string | null;
  teamId!: string | null;
  stripeCustomerId?: string | null;
  name!: string | null;
  slug!: string;
  githubAccountId!: string | null;
  vercelConfigurationId!: string | null;

  override $formatDatabaseJson(json: Pojo) {
    json = super.$formatDatabaseJson(json);
    if (json["name"]) {
      json["name"] = json["name"].trim();
    }
    if (json["slug"]) {
      json["slug"] = json["slug"].trim();
    }
    return json;
  }

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
      githubAccount: {
        relation: Model.HasOneRelation,
        modelClass: GithubAccount,
        join: {
          from: "accounts.githubAccountId",
          to: "github_accounts.id",
        },
      },
      vercelConfiguration: {
        relation: Model.HasOneRelation,
        modelClass: VercelConfiguration,
        join: {
          from: "accounts.vercelConfigurationId",
          to: "vercel_configurations.id",
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
      projects: {
        relation: Model.HasManyRelation,
        modelClass: Project,
        join: {
          from: "accounts.id",
          to: "projects.accountId",
        },
      },
    };
  }

  user?: User | null;
  team?: Team | null;
  purchases?: Purchase[];
  projects?: Project[];

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
      .whereRaw("?? < now()", "startDate")
      .where((query) =>
        query.whereNull("endDate").orWhereRaw("?? >= now()", "endDate")
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

  async getScreenshotsMonthlyLimit() {
    const plan = await this.getPlan();
    return plan ? plan.screenshotsLimitPerMonth : null;
  }

  async getCurrentConsumptionStartDate() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const purchase = await this.getActivePurchase();
    return this.forcedPlanId || !purchase?.startDate
      ? startOfMonth
      : purchase.getLastResetDate();
  }

  async getScreenshotsCurrentConsumption() {
    const startDate = await this.getCurrentConsumptionStartDate();
    const query = Screenshot.query()
      .leftJoinRelated("screenshotBucket.project.githubRepository")
      .where("screenshots.createdAt", ">=", startDate)
      .where("screenshotBucket:project.accountId", this.id)
      .where((builder) =>
        builder
          .where((builder) => {
            builder
              .whereNull("screenshotBucket:project.private")
              .andWhere(
                "screenshotBucket:project:githubRepository.private",
                true
              );
          })
          .orWhere("screenshotBucket:project.private", true)
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

  async hasUsageBasedPlan() {
    const activePurchase = await this.getActivePurchase();
    if (!activePurchase) return false;

    const plan = await activePurchase.$relatedQuery<Plan>("plan").first();
    if (!plan) return false;

    return plan.usageBased;
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
