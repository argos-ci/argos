import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { memoize } from "lodash-es";
import type { Pojo, RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { GithubAccount } from "./GithubAccount.js";
import { Plan } from "./Plan.js";
import { Project } from "./Project.js";
import { ScreenshotBucket } from "./ScreenshotBucket.js";
import { SlackInstallation } from "./SlackInstallation.js";
import { Subscription } from "./Subscription.js";
import { Team } from "./Team.js";
import { User } from "./User.js";

/** @public */
export type AccountAvatar = {
  getUrl(args: { size?: number }): string | Promise<string> | null;
  initial: string;
  color: string;
};

type AccountSubscriptionStatus = Subscription["status"] | "trial_expired";

type AccountSubscriptionManager = {
  getActiveSubscription(): Promise<Subscription | null>;
  getPlan(): Promise<Plan | null>;
  checkIsUsageBasedPlan(): Promise<boolean>;
  getCurrentPeriodStartDate(): Promise<Date>;
  getCurrentPeriodEndDate(): Promise<Date>;
  getCurrentPeriodScreenshots(): Promise<number>;
  getCurrentPeriodConsumptionRatio(): Promise<number>;
  checkIsOutOfCapacity(): Promise<"flat-rate" | "trialing" | null>;
  getIncludedScreenshots(): Promise<number>;
  getSubscriptionStatus(): Promise<AccountSubscriptionStatus | null>;
};

export type AccountPermission = "admin" | "view";

export const ALL_ACCOUNT_PERMISSIONS: AccountPermission[] = ["admin", "view"];

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
        pattern: "^[-a-z0-9]+$",
      },
      githubAccountId: { type: ["string", "null"] },
      gitlabBaseUrl: { type: ["string", "null"] },
      slackInstallationId: { type: ["string", "null"] },
    },
  });

  userId!: string | null;
  forcedPlanId!: string | null;
  teamId!: string | null;
  stripeCustomerId?: string | null;
  name!: string | null;
  slug!: string;
  githubAccountId!: string | null;
  gitlabAccessToken!: string | null;
  gitlabBaseUrl!: string | null;
  slackInstallationId!: string | null;

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
      subscriptions: {
        relation: Model.HasManyRelation,
        modelClass: Subscription,
        join: {
          from: "accounts.id",
          to: "subscriptions.accountId",
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
      slackInstallation: {
        relation: Model.HasOneRelation,
        modelClass: SlackInstallation,
        join: {
          from: "accounts.slackInstallationId",
          to: "slack_installations.id",
        },
      },
    };
  }

  user?: User | null;
  team?: Team | null;
  githubAccount?: GithubAccount | null;
  subscriptions?: Subscription[];
  projects?: Project[];
  slackInstallation?: SlackInstallation | null;

  _cachedSubscriptionManager?: AccountSubscriptionManager;

  static override virtualAttributes = ["type"];

  get type() {
    if (this.userId && !this.teamId) {
      return "user";
    }
    if (!this.userId && this.teamId) {
      return "team";
    }
    throw new Error("Incoherent account type");
  }

  async $checkHasSubscribedToTrial() {
    invariant(
      this.userId,
      "$checkHasSubscribedToTrial can only be called on users",
    );
    const subscriptionCount = await Subscription.query()
      .where({ subscriberId: this.userId })
      .whereNotNull("trialEndDate")
      .limit(1)
      .resultSize();
    return subscriptionCount > 0;
  }

  $getSubscriptionManager(): AccountSubscriptionManager {
    if (this._cachedSubscriptionManager) {
      return this._cachedSubscriptionManager;
    }

    const getActiveSubscription = memoize(async () => {
      if (!this.id) {
        return null;
      }
      if (this.forcedPlanId) {
        return null;
      }

      const subscription = await Subscription.query()
        .where("accountId", this.id)
        .whereRaw("?? < now()", "startDate")
        .whereNot("status", "canceled")
        .where((query) =>
          query.whereNull("endDate").orWhereRaw("?? >= now()", "endDate"),
        )
        .withGraphJoined("plan")
        .orderBy("plan.includedScreenshots", "DESC")
        .first();

      return subscription ?? null;
    });

    const getPlan = memoize(async () => {
      if (this.forcedPlanId) {
        const plan = await Plan.query().findById(this.forcedPlanId);
        return plan ?? null;
      }
      if (this.userId) {
        return Plan.getFreePlan();
      }
      const subscription = await getActiveSubscription();
      return subscription?.plan ?? null;
    });

    const getCurrentPeriodStartDate = memoize(async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      if (this.forcedPlanId) {
        return startOfMonth;
      }
      const subscription = await getActiveSubscription();
      return subscription?.startDate
        ? subscription.getLastResetDate()
        : startOfMonth;
    });

    const getCurrentPeriodEndDate = memoize(async () => {
      const [startDate, activeSubscription] = await Promise.all([
        getCurrentPeriodStartDate(),
        getActiveSubscription(),
      ]);

      if (activeSubscription?.status === "trialing") {
        invariant(activeSubscription.trialEndDate);
        return new Date(activeSubscription.trialEndDate);
      }

      const now = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(startDate.getMonth() + 1);
      return new Date(
        Math.min(
          endDate.getTime(),
          new Date(now.getFullYear(), now.getMonth() + 2, 0).getTime(),
        ),
      );
    });

    const getCurrentPeriodScreenshots = memoize(async () => {
      const startDate = await getCurrentPeriodStartDate();
      return this.$getScreenshotCountFromDate(startDate.toISOString());
    });

    const checkIsUsageBasedPlan = memoize(async () => {
      const plan = await getPlan();
      return Boolean(plan?.usageBased);
    });

    const getIncludedScreenshots = memoize(async () => {
      const [plan, subscription] = await Promise.all([
        getPlan(),
        getActiveSubscription(),
      ]);
      return (
        subscription?.includedScreenshots ?? plan?.includedScreenshots ?? 0
      );
    });

    const getCurrentPeriodConsumptionRatio = memoize(async () => {
      const [screenshotsCount, includedScreenshots] = await Promise.all([
        getCurrentPeriodScreenshots(),
        getIncludedScreenshots(),
      ]);

      if (includedScreenshots === 0) {
        return 1;
      }

      return screenshotsCount / includedScreenshots;
    });

    const getSubscriptionStatus = memoize(async () => {
      if (this.forcedPlanId !== null) {
        return "active";
      }

      if (this.type === "user") {
        return null;
      }

      const [trialing, subscription] = await Promise.all([
        checkIsUsageBasedPlan(),
        getActiveSubscription(),
      ]);

      if (subscription) {
        // We consider a trialing subscription as active
        // if the payment method is filled.
        if (trialing && subscription.paymentMethodFilled) {
          return "active";
        }
        return subscription.status;
      }

      const previousPaidSubscription = await Subscription.query()
        .where("accountId", this.id)
        .whereNot({ name: "free" })
        .whereRaw("?? < now()", "endDate")
        .joinRelated("plan")
        .orderBy("endDate", "DESC")
        .first();

      const subscriptionEndsAtTrialEnd =
        previousPaidSubscription &&
        previousPaidSubscription.endDate ===
          previousPaidSubscription.trialEndDate;

      if (subscriptionEndsAtTrialEnd) {
        return "trial_expired";
      }

      return "canceled";
    });

    const checkIsOutOfCapacity = memoize(async () => {
      const [usageBased, consumptionRatio, activeSubscription] =
        await Promise.all([
          checkIsUsageBasedPlan(),
          getCurrentPeriodConsumptionRatio(),
          getActiveSubscription(),
        ]);

      if (usageBased) {
        if (activeSubscription?.status === "trialing") {
          // If trialing and a payment method is filled
          // then we allow the user to go over capacity
          if (activeSubscription.paymentMethodFilled) {
            return null;
          }
          // If trialing and a payment method is not filled
          // then we don't allow the user to go over capacity
          return consumptionRatio > 1 ? "trialing" : null;
        }
        // If the plan is usage based, and the user is not trialing
        // then we are never out of capacity
        return null;
      }
      return consumptionRatio > 1.1 ? "flat-rate" : null;
    });

    this._cachedSubscriptionManager = {
      getActiveSubscription,
      getPlan,
      checkIsUsageBasedPlan,
      getCurrentPeriodStartDate,
      getCurrentPeriodEndDate,
      getCurrentPeriodScreenshots,
      getCurrentPeriodConsumptionRatio,
      checkIsOutOfCapacity,
      getIncludedScreenshots,
      getSubscriptionStatus,
    };

    return this._cachedSubscriptionManager;
  }

  async $getScreenshotCountFromDate(
    from: string,
    options?: {
      projectId?: string;
    },
  ): Promise<number> {
    const query = ScreenshotBucket.query()
      .sum("screenshot_buckets.screenshotCount as total")
      .leftJoinRelated("project.githubRepository")
      .where("screenshot_buckets.createdAt", ">=", from)
      .where("project.accountId", this.id)
      .first();

    if (options?.projectId) {
      query.where("project.id", options.projectId);
    }

    const result = (await query) as unknown as { total: string | null };
    return result.total ? Number(result.total) : 0;
  }

  static async getPermissions(
    account: Account,
    user: User | null,
  ): Promise<AccountPermission[]> {
    switch (account.type) {
      case "user":
        return User.getPermissions(account.userId as string, user);
      case "team":
        return Team.getPermissions(account.teamId as string, user);
      default:
        assertNever(account.type);
    }
  }

  async $getPermissions(user: User | null): Promise<AccountPermission[]> {
    return Account.getPermissions(this, user);
  }
}
