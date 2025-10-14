import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { memoize } from "lodash-es";
import type { Pojo, RelationMappings } from "objection";

import { slugJsonSchema } from "@/util/slug.js";

import { computeAdditionalScreenshots } from "../services/additional-screenshots.js";
import { Model } from "../util/model.js";
import { timestampsSchema } from "../util/schemas.js";
import { ArtifactBucket } from "./ArtifactBucket.js";
import { GithubAccount } from "./GithubAccount.js";
import { GithubInstallation } from "./GithubInstallation.js";
import { Plan } from "./Plan.js";
import { Project } from "./Project.js";
import { SlackInstallation } from "./SlackInstallation.js";
import { Subscription } from "./Subscription.js";
import { Team } from "./Team.js";
import { User } from "./User.js";

/** @public */
export type AccountAvatar = {
  url(args: { size?: number }): string | null | Promise<string | null>;
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
  getCurrentPeriodScreenshots(options?: {
    to?: "previousUsage";
    projectId?: string;
  }): Promise<{
    all: number;
    neutral: number;
    storybook: number;
  }>;
  getAdditionalScreenshotCost(options?: {
    to?: "previousUsage";
  }): Promise<number>;
  getCurrentPeriodConsumptionRatio(): Promise<number>;
  checkIsOutOfCapacity(): Promise<"flat-rate" | "trialing" | null>;
  getIncludedScreenshots(): Promise<number>;
  getSubscriptionStatus(): Promise<AccountSubscriptionStatus | null>;
  checkCanExtendTrial(): Promise<boolean>;
};

export type AccountPermission = "admin" | "view";

export const ALL_ACCOUNT_PERMISSIONS: AccountPermission[] = ["admin", "view"];

export class Account extends Model {
  static override tableName = "accounts";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["slug"],
        properties: {
          userId: { type: ["string", "null"] },
          forcedPlanId: { type: ["string", "null"] },
          stripeCustomerId: { type: ["string", "null"] },
          teamId: { type: ["string", "null"] },
          name: { type: ["string", "null"], maxLength: 255, minLength: 1 },
          slug: slugJsonSchema,
          githubAccountId: { type: ["string", "null"] },
          gitlabBaseUrl: { type: ["string", "null"] },
          slackInstallationId: { type: ["string", "null"] },
          githubLightInstallationId: { type: ["string", "null"] },
          meteredSpendLimitByPeriod: {
            anyOf: [{ type: "null" }, { type: "integer", minimum: 0 }],
          },
          blockWhenSpendLimitIsReached: { type: "boolean" },
        },
      },
    ],
  };

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
  githubLightInstallationId!: string | null;
  meteredSpendLimitByPeriod!: number | null;
  blockWhenSpendLimitIsReached!: boolean;

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
      githubLightInstallation: {
        relation: Model.HasOneRelation,
        modelClass: GithubInstallation,
        join: {
          from: "accounts.githubLightInstallationId",
          to: "github_installations.id",
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
  githubLightInstallation?: GithubInstallation | null;

  _cachedSubscriptionManager?: AccountSubscriptionManager;

  static override virtualAttributes = ["type", "displayName"];

  get type() {
    if (this.userId && !this.teamId) {
      return "user";
    }
    if (!this.userId && this.teamId) {
      return "team";
    }
    throw new Error("Incoherent account type");
  }

  /**
   * Best display name for the account.
   */
  get displayName() {
    return this.name || this.slug;
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
        .whereIn("status", ["active", "trialing", "past_due"])
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
      const [subscription, plan] = await Promise.all([
        getActiveSubscription(),
        getPlan(),
      ]);
      if (subscription?.startDate) {
        invariant(plan, "If there is a subscription, there should be a plan");
        return subscription.getLastResetDate(now, plan.interval);
      }
      const interval = plan?.interval ?? "month";
      switch (interval) {
        case "month":
          return new Date(now.getFullYear(), now.getMonth(), 1);
        case "year":
          return new Date(now.getFullYear(), 0, 1);
        default:
          assertNever(interval);
      }
    });

    const getCurrentPeriodEndDate = memoize(async () => {
      const [startDate, activeSubscription, plan] = await Promise.all([
        getCurrentPeriodStartDate(),
        getActiveSubscription(),
        getPlan(),
      ]);

      if (activeSubscription?.status === "trialing") {
        invariant(activeSubscription.trialEndDate);
        return new Date(activeSubscription.trialEndDate);
      }

      const interval = plan?.interval ?? "month";

      switch (interval) {
        case "month": {
          const now = new Date();
          const endDate = new Date(startDate);
          endDate.setMonth(startDate.getMonth() + 1);
          return new Date(
            Math.min(
              endDate.getTime(),
              new Date(now.getFullYear(), now.getMonth() + 2, 0).getTime(),
            ),
          );
        }
        case "year": {
          const endDate = new Date(startDate);
          endDate.setFullYear(startDate.getFullYear() + 1);
          return endDate;
        }
        default:
          assertNever(interval);
      }
    });

    const getCurrentPeriodScreenshots: AccountSubscriptionManager["getCurrentPeriodScreenshots"] =
      memoize(async (options) => {
        const [subscription, startDate, usageBased] = await Promise.all([
          getActiveSubscription(),
          getCurrentPeriodStartDate(),
          checkIsUsageBasedPlan(),
        ]);
        const to = (() => {
          if (options?.to === "previousUsage") {
            invariant(
              usageBased,
              "`previousUsage` is only available for usage based plans",
            );
            return new Date(subscription?.usageUpdatedAt ?? startDate);
          }
          return "now";
        })();
        return this.$getScreenshotCountBetween(startDate, to, {
          projectId: options?.projectId,
        });
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
      const [screenshots, includedScreenshots] = await Promise.all([
        getCurrentPeriodScreenshots(),
        getIncludedScreenshots(),
      ]);

      if (includedScreenshots === 0) {
        return 1;
      }

      return screenshots.all / includedScreenshots;
    });

    const getSubscriptionStatus = memoize(async () => {
      if (this.forcedPlanId !== null) {
        return "active";
      }

      if (this.type === "user") {
        return null;
      }

      const subscription = await getActiveSubscription();

      if (subscription) {
        // We consider a trialing subscription as active
        // if the payment method is filled.
        if (
          subscription.status === "trialing" &&
          subscription.paymentMethodFilled
        ) {
          return "active";
        }
        return subscription.status;
      }

      const previousPaidSubscription = await Subscription.query()
        .joinRelated("plan")
        .where("subscriptions.accountId", this.id)
        .whereNot("plan.name", "free")
        .where((qb) => {
          qb.whereNull("endDate").orWhereRaw("?? >= now()", "endDate");
        })
        .orderBy("startDate", "desc")
        .first();

      if (previousPaidSubscription) {
        if (
          previousPaidSubscription.trialEndDate &&
          new Date(previousPaidSubscription.trialEndDate) < new Date()
        ) {
          return "trial_expired";
        }

        if (
          previousPaidSubscription.status === "past_due" ||
          previousPaidSubscription.status === "unpaid"
        ) {
          return previousPaidSubscription.status;
        }
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

    const getAdditionalScreenshotCost: AccountSubscriptionManager["getAdditionalScreenshotCost"] =
      memoize(async (options) => {
        const [usageBased, subscription, periodScreenshots] = await Promise.all(
          [
            checkIsUsageBasedPlan(),
            getActiveSubscription(),
            getCurrentPeriodScreenshots(options),
          ],
        );

        // For non-usage based plans, there is no additional cost.
        if (!usageBased) {
          return 0;
        }

        invariant(
          subscription,
          "There should be an active subscription for usage based plans",
        );

        if (subscription.includedScreenshots === null) {
          return 0;
        }

        const price = {
          neutral: subscription.additionalScreenshotPrice ?? 0,
          storybook:
            subscription.additionalStorybookScreenshotPrice ??
            subscription.additionalScreenshotPrice ??
            0,
        };

        const additional = computeAdditionalScreenshots({
          ...periodScreenshots,
          included: subscription.includedScreenshots,
        });

        return (
          additional.neutral * price.neutral +
          additional.storybook * price.storybook
        );
      });

    const checkCanExtendTrial = memoize(async () => {
      // Check if there is exactly one trial expired subscription
      const trialExpiredSubscriptions = await Subscription.query()
        .where("accountId", this.id)
        .whereRaw(`"trialEndDate" < now()`)
        // No need to look more than 2
        .limit(2)
        .resultSize();

      return trialExpiredSubscriptions === 1;
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
      getAdditionalScreenshotCost,
      checkCanExtendTrial,
    };

    return this._cachedSubscriptionManager;
  }

  async $getScreenshotCountBetween(
    from: Date,
    to: Date | "now",
    options?: {
      projectId?: string | undefined;
    },
  ): Promise<{
    all: number;
    neutral: number;
    storybook: number;
  }> {
    const query = ArtifactBucket.query()
      .sum("artifact_buckets.artifactCount as all")
      .sum("artifact_buckets.storybookArtifactCount as storybook")
      .leftJoinRelated("project")
      .where("artifact_buckets.createdAt", ">=", from.toISOString())
      .where("project.accountId", this.id)
      .first();

    if (to !== "now") {
      query.where("artifact_buckets.createdAt", "<", to.toISOString());
    }

    if (options?.projectId) {
      query.where("project.id", options.projectId);
    }

    const result = (await query) as unknown as {
      all: string | null;
      storybook: string | null;
    };
    const all = result.all ? Number(result.all) : 0;
    const storybook = result.storybook ? Number(result.storybook) : 0;
    const neutral = all - storybook;
    return { all, neutral, storybook };
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

  /**
   * Get the owner ids associated with the account.
   */
  async $getOwnerIds(): Promise<string[]> {
    if (this.userId && !this.teamId) {
      return [this.userId];
    }
    if (this.teamId && !this.userId) {
      return Team.getOwnerIds(this.teamId);
    }
    throw new Error("Incoherent account type");
  }

  async $getPermissions(user: User | null): Promise<AccountPermission[]> {
    return Account.getPermissions(this, user);
  }
}
