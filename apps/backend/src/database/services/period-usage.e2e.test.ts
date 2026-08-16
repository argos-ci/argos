import { beforeEach, describe, expect, it } from "vitest";

import type { Account, Plan, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import type { AccountBilling } from "./period-usage";
import { getAccountBillings } from "./period-usage";

/** Overage of the period still running, which is the first one returned. */
function getRunningCost(billing: AccountBilling | undefined) {
  return billing?.periodUsage?.billingPeriods[0]?.additionalScreenshotCost;
}

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
      // A subscription running since 2021: its periods reset on the 1st, and
      // every one of them is old enough to have been invoiced.
      createdAt: new Date("2021-01-01").toISOString(),
      startDate: new Date("2021-01-01").toISOString(),
      status: "active",
    });
  }

  it("reports no plan and no usage for an account without a subscription", async () => {
    const usages = await getAccountBillings([account]);
    expect(usages.get(account.id)).toEqual({
      plan: null,
      flatPrice: null,
      periodUsage: null,
    });
  });

  it("reports a granted plan, and no usage under it", async () => {
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

    const usages = await getAccountBillings([grantedAccount]);

    // The plan still comes back: it is what explains why nothing is billed.
    expect(usages.get(grantedAccount.id)).toEqual({
      plan: expect.objectContaining({ id: usageBasedPlan.id }),
      flatPrice: null,
      periodUsage: null,
    });
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

    const usages = await getAccountBillings([account]);

    expect(usages.get(account.id)).toEqual({
      plan: expect.objectContaining({ id: flatPlan.id }),
      flatPrice: null,
      periodUsage: null,
    });
  });

  it("returns zero cost when the account stays inside its quota", async () => {
    await createUsageBasedSubscription();
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date(inPeriod.getTime() + 1000).toISOString(),
      screenshotCount: 400,
      storybookScreenshotCount: 0,
    });

    const usage = await getAccountBillings([account]).then((usages) =>
      usages.get(account.id),
    );

    expect(usage?.periodUsage).toMatchObject({
      storybookRatio: 0,
      storybookCount: 0,
    });
    expect(getRunningCost(usage)).toBe(0);
  });

  it("bills the overage at the neutral price", async () => {
    await createUsageBasedSubscription();
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date(inPeriod.getTime() + 1000).toISOString(),
      screenshotCount: 1200,
      storybookScreenshotCount: 0,
    });

    const usage = await getAccountBillings([account]).then((usages) =>
      usages.get(account.id),
    );

    // 200 over the 1000 included, at $0.50.
    expect(getRunningCost(usage)).toBe(100);
  });

  it("bills Storybook screenshots at their own price and reports the mix", async () => {
    await createUsageBasedSubscription();
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date(inPeriod.getTime() + 1000).toISOString(),
      screenshotCount: 1500,
      storybookScreenshotCount: 1000,
    });

    const usage = await getAccountBillings([account]).then((usages) =>
      usages.get(account.id),
    );

    // 500 neutral fit under the 1000 included, so 500 of the Storybook
    // screenshots absorb the rest of the quota and 500 are billed at $0.10.
    expect(getRunningCost(usage)).toBeCloseTo(50);
    expect(usage?.periodUsage?.storybookRatio).toBeCloseTo(1000 / 1500);
    expect(usage?.periodUsage?.storybookCount).toBe(1000);
  });

  it("clamps a bucket's Storybook count to its total", async () => {
    await createUsageBasedSubscription();
    // Buckets finalized while the two counts were read by two separate queries
    // can hold more Storybook screenshots than screenshots. Left alone, the
    // neutral count derived from the pair goes negative.
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date(inPeriod.getTime() + 1000).toISOString(),
      screenshotCount: 1500,
      storybookScreenshotCount: 1600,
    });

    const usage = await getAccountBillings([account]).then((usages) =>
      usages.get(account.id),
    );

    // Read as 1500 Storybook and 0 neutral: 1000 absorb the quota and 500 are
    // billed at $0.10.
    expect(getRunningCost(usage)).toBeCloseTo(50);
    expect(usage?.periodUsage?.storybookRatio).toBe(1);
    expect(usage?.periodUsage?.storybookCount).toBe(1500);
  });

  it("ignores screenshots uploaded before the period started", async () => {
    await createUsageBasedSubscription();
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date(inPeriod.getTime() - 86_400_000).toISOString(),
      screenshotCount: 5000,
      storybookScreenshotCount: 0,
    });

    const usage = await getAccountBillings([account]).then((usages) =>
      usages.get(account.id),
    );

    // Out of period for the cost, still part of the lifetime mix.
    expect(getRunningCost(usage)).toBe(0);
    expect(usage?.periodUsage?.storybookRatio).toBe(0);
  });

  it("prices each period against its own quota", async () => {
    // The included screenshots reset at every period, so an account that goes
    // slightly over twice owes twice — summing the two months and pricing the
    // total against a single quota would report roughly half of that.
    await createUsageBasedSubscription();
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date(inPeriod.getTime() + 1000).toISOString(),
      screenshotCount: 1200,
      storybookScreenshotCount: 0,
    });
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date(inPeriod.getTime() - 86_400_000).toISOString(),
      screenshotCount: 1400,
      storybookScreenshotCount: 0,
    });

    const usage = await getAccountBillings([account]).then((usages) =>
      usages.get(account.id),
    );

    const [running, closed] = usage?.periodUsage?.billingPeriods ?? [];
    // 200 over in the running period, 400 over in the one before it.
    expect(running).toMatchObject({
      closed: false,
      additionalScreenshotCost: 100,
    });
    expect(closed).toMatchObject({
      closed: true,
      additionalScreenshotCost: 200,
    });
    // Contiguous: each period ends where the next one opens.
    expect(closed?.to).toEqual(running?.from);
  });

  it("leaves out the periods the trial covers", async () => {
    // Stripe never bills usage consumed during a trial, and converting one
    // opens a fresh period at the moment it ends. Pricing the periods before
    // that would invoice the trial.
    const subscription = await createUsageBasedSubscription();
    await subscription
      .$query()
      .patch({ trialEndDate: new Date(inPeriod.getTime()).toISOString() });
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date(inPeriod.getTime() - 86_400_000).toISOString(),
      screenshotCount: 50_000,
      storybookScreenshotCount: 0,
    });

    const usage = await getAccountBillings([account]).then((usages) =>
      usages.get(account.id),
    );

    expect(usage?.periodUsage?.billingPeriods).toHaveLength(1);
    expect(getRunningCost(usage)).toBe(0);
  });

  it("leaves out the periods that predate the subscription", async () => {
    // Boundaries are walked back from an anniversary, so they keep going past
    // the day the subscription started. Pricing those as closed periods would
    // report invoices that were never sent — and hide the running period, which
    // is the only thing a team billed for the first time has.
    const subscription = await createUsageBasedSubscription();
    await subscription
      .$query()
      .patch({ createdAt: new Date(inPeriod.getTime() + 1000).toISOString() });
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      createdAt: new Date(inPeriod.getTime() + 2000).toISOString(),
      screenshotCount: 1200,
      storybookScreenshotCount: 0,
    });

    const usage = await getAccountBillings([account]).then((usages) =>
      usages.get(account.id),
    );

    expect(usage?.periodUsage?.billingPeriods).toHaveLength(1);
    expect(getRunningCost(usage)).toBe(100);
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

    const usages = await getAccountBillings([
      account,
      otherAccount,
      noSubscriptionAccount,
    ]);

    expect(getRunningCost(usages.get(account.id))).toBe(100);
    expect(getRunningCost(usages.get(otherAccount.id))).toBe(50);
    expect(usages.get(noSubscriptionAccount.id)).toEqual({
      plan: null,
      flatPrice: null,
      periodUsage: null,
    });
  });
});
