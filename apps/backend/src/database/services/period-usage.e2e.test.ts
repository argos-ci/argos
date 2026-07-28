import { beforeEach, describe, expect, it } from "vitest";

import type { Account, Plan, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getAccountPeriodUsages } from "./period-usage";

describe("getAccountPeriodUsages", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  const now = new Date();
  let usageBasedPlan: Plan;
  let account: Account;
  let project: Project;

  /**
   * Well inside the current period: the subscription started on the 1st of a
   * past month, so the period resets on the 1st of the current one.
   */
  const inPeriod = new Date(now.getFullYear(), now.getMonth(), 1);

  beforeEach(async () => {
    usageBasedPlan = await factory.Plan.create({
      usageBased: true,
      interval: "month",
    });
    account = await factory.TeamAccount.create();
    project = await factory.Project.create({ accountId: account.id });
  });

  async function createUsageBasedSubscription() {
    const user = await factory.User.create();
    return factory.Subscription.create({
      accountId: account.id,
      planId: usageBasedPlan.id,
      includedScreenshots: 1000,
      currency: "usd",
      additionalScreenshotPrice: 0.5,
      additionalStorybookScreenshotPrice: 0.1,
      provider: "stripe",
      stripeSubscriptionId: "sub_period_usage",
      subscriberId: user.id,
      startDate: new Date("2021-01-01").toISOString(),
      status: "active",
    });
  }

  it("returns null for an account without a usage-based subscription", async () => {
    const usages = await getAccountPeriodUsages([account]);
    expect(usages.get(account.id)).toBeNull();
  });

  it("returns null for a granted plan, even with a subscription still on file", async () => {
    // Open source and comped accounts read as `active` everywhere because a
    // forced plan short-circuits the status, and they bill nothing.
    await createUsageBasedSubscription();
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date(inPeriod.getTime() + 1000).toISOString(),
      screenshotCount: 5000,
      storybookScreenshotCount: 0,
    });
    await account.$query().patch({ forcedPlanId: usageBasedPlan.id });
    const grantedAccount = await account.$query();

    const usages = await getAccountPeriodUsages([grantedAccount]);

    expect(usages.get(grantedAccount.id)).toBeNull();
  });

  it("resolves the same subscription as the account manager does", async () => {
    // Two active subscriptions at once: the manager picks on
    // `includedScreenshots` alone, so the flat one wins and the account is not
    // billed by usage. Picking the usage-based one here would price the row
    // against a plan it is not billed on.
    await createUsageBasedSubscription();
    const flatPlan = await factory.Plan.create({
      usageBased: false,
      interval: "month",
      includedScreenshots: 1_000_000,
    });
    const flatUser = await factory.User.create();
    await factory.Subscription.create({
      accountId: account.id,
      planId: flatPlan.id,
      includedScreenshots: 1_000_000,
      currency: "usd",
      provider: "github",
      subscriberId: flatUser.id,
      startDate: new Date("2021-01-01").toISOString(),
      status: "active",
    });
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date(inPeriod.getTime() + 1000).toISOString(),
      screenshotCount: 5000,
      storybookScreenshotCount: 0,
    });

    const usages = await getAccountPeriodUsages([account]);

    expect(usages.get(account.id)).toBeNull();
  });

  it("returns zero cost when the account stays inside its quota", async () => {
    await createUsageBasedSubscription();
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date(inPeriod.getTime() + 1000).toISOString(),
      screenshotCount: 400,
      storybookScreenshotCount: 0,
    });

    const usage = await getAccountPeriodUsages([account]).then((usages) =>
      usages.get(account.id),
    );

    expect(usage).toEqual({
      additionalScreenshotCost: 0,
      storybookRatio: 0,
      storybookCount: 0,
    });
  });

  it("bills the overage at the neutral price", async () => {
    await createUsageBasedSubscription();
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date(inPeriod.getTime() + 1000).toISOString(),
      screenshotCount: 1200,
      storybookScreenshotCount: 0,
    });

    const usage = await getAccountPeriodUsages([account]).then((usages) =>
      usages.get(account.id),
    );

    // 200 over the 1000 included, at $0.50.
    expect(usage?.additionalScreenshotCost).toBe(100);
  });

  it("bills Storybook screenshots at their own price and reports the mix", async () => {
    await createUsageBasedSubscription();
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date(inPeriod.getTime() + 1000).toISOString(),
      screenshotCount: 1500,
      storybookScreenshotCount: 1000,
    });

    const usage = await getAccountPeriodUsages([account]).then((usages) =>
      usages.get(account.id),
    );

    // 500 neutral fit under the 1000 included, so 500 of the Storybook
    // screenshots absorb the rest of the quota and 500 are billed at $0.10.
    expect(usage?.additionalScreenshotCost).toBeCloseTo(50);
    expect(usage?.storybookRatio).toBeCloseTo(1000 / 1500);
    expect(usage?.storybookCount).toBe(1000);
  });

  it("ignores screenshots uploaded before the period started", async () => {
    await createUsageBasedSubscription();
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date(inPeriod.getTime() - 86_400_000).toISOString(),
      screenshotCount: 5000,
      storybookScreenshotCount: 0,
    });

    const usage = await getAccountPeriodUsages([account]).then((usages) =>
      usages.get(account.id),
    );

    // Out of period for the cost, still part of the lifetime mix.
    expect(usage?.additionalScreenshotCost).toBe(0);
    expect(usage?.storybookRatio).toBe(0);
  });

  it("keeps accounts apart within one batch", async () => {
    await createUsageBasedSubscription();
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date(inPeriod.getTime() + 1000).toISOString(),
      screenshotCount: 1200,
      storybookScreenshotCount: 0,
    });

    const otherAccount = await factory.TeamAccount.create();
    const otherProject = await factory.Project.create({
      accountId: otherAccount.id,
    });
    const otherUser = await factory.User.create();
    await factory.Subscription.create({
      accountId: otherAccount.id,
      planId: usageBasedPlan.id,
      includedScreenshots: 1000,
      currency: "usd",
      additionalScreenshotPrice: 0.5,
      additionalStorybookScreenshotPrice: 0.1,
      provider: "stripe",
      stripeSubscriptionId: "sub_period_usage_other",
      subscriberId: otherUser.id,
      startDate: new Date("2021-01-01").toISOString(),
      status: "active",
    });
    await factory.ScreenshotBucket.create({
      projectId: otherProject.id,
      createdAt: new Date(inPeriod.getTime() + 1000).toISOString(),
      screenshotCount: 1100,
      storybookScreenshotCount: 0,
    });

    const noSubscriptionAccount = await factory.TeamAccount.create();

    const usages = await getAccountPeriodUsages([
      account,
      otherAccount,
      noSubscriptionAccount,
    ]);

    expect(usages.get(account.id)?.additionalScreenshotCost).toBe(100);
    expect(usages.get(otherAccount.id)?.additionalScreenshotCost).toBe(50);
    expect(usages.get(noSubscriptionAccount.id)).toBeNull();
  });
});
