import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import {
  getBilledTeams,
  getStaffRevenue,
  getTeamCustomers,
  startOfUTCMonth,
} from "./revenue";

let sequence = 0;

/** A team on a Stripe subscription, as the revenue reader looks for it. */
async function createTeam(options: {
  interval: "month" | "year";
  status?: "active" | "past_due" | "trialing" | "canceled";
  endDate?: string;
  /** Set to grant the plan, which bills nothing. */
  granted?: boolean;
  /** Teams that never reached Stripe have no customer to match invoices on. */
  withCustomer?: boolean;
  stripeCustomerId?: string;
}) {
  sequence += 1;
  const plan = await factory.Plan.create({
    usageBased: true,
    interval: options.interval,
    includedScreenshots: 1000,
  });
  const account = await factory.TeamAccount.create({
    stripeCustomerId:
      options.withCustomer === false
        ? null
        : (options.stripeCustomerId ?? `cus_revenue_${sequence}`),
    forcedPlanId: options.granted ? plan.id : null,
  });
  const user = await factory.User.create();
  await factory.Subscription.create({
    accountId: account.id,
    planId: plan.id,
    currency: "usd",
    provider: "stripe",
    stripeSubscriptionId: `sub_revenue_${sequence}`,
    subscriberId: user.id,
    startDate: new Date("2021-01-01").toISOString(),
    endDate: options.endDate ?? null,
    status: options.status ?? "active",
    trialEndDate:
      options.status === "trialing"
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null,
  });
  return account;
}

describe("getBilledTeams", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("returns a paying team with the interval it is billed on", async () => {
    const monthly = await createTeam({ interval: "month" });
    const yearly = await createTeam({ interval: "year" });

    const teams = await getBilledTeams();

    expect(teams).toHaveLength(2);
    expect(teams).toContainEqual(
      expect.objectContaining({ accountId: monthly.id, interval: "month" }),
    );
    expect(teams).toContainEqual(
      expect.objectContaining({ accountId: yearly.id, interval: "year" }),
    );
  });

  it("keeps a team whose invoice has not cleared", async () => {
    // The invoice was raised; whether it is paid is a collection question, and
    // the invoice is what this reads.
    const account = await createTeam({ interval: "month", status: "past_due" });

    const teams = await getBilledTeams();

    expect(teams.map((team) => team.accountId)).toEqual([account.id]);
  });

  it.each([
    ["a trial, which pays nothing", { status: "trialing" as const }],
    ["a canceled subscription", { status: "canceled" as const }],
    ["a granted plan, which bills nothing", { granted: true }],
    ["a team that never reached Stripe", { withCustomer: false }],
  ])("drops %s", async (_label, options) => {
    await createTeam({ interval: "month", ...options });

    await expect(getBilledTeams()).resolves.toEqual([]);
  });

  it("resolves one row per team when two subscriptions are active", async () => {
    // Two active subscriptions resolve the highest quota, the same one
    // `getAccountBillings` picks — so both sides price the same plan.
    const account = await createTeam({ interval: "month" });
    const richerPlan = await factory.Plan.create({
      usageBased: true,
      interval: "year",
      includedScreenshots: 1_000_000,
    });
    const user = await factory.User.create();
    await factory.Subscription.create({
      accountId: account.id,
      planId: richerPlan.id,
      currency: "usd",
      provider: "stripe",
      stripeSubscriptionId: "sub_revenue_richer",
      subscriberId: user.id,
      startDate: new Date("2021-01-01").toISOString(),
      status: "active",
    });

    const teams = await getBilledTeams();

    expect(teams).toHaveLength(1);
    expect(teams[0]?.interval).toBe("year");
  });
});

describe("getTeamCustomers", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("keeps a team whose subscription has ended, with its names", async () => {
    // Its invoices were still sent, and the month it was invoiced in has to
    // keep them — that departure is exactly what a comparison between two
    // months exists to show.
    const account = await createTeam({
      interval: "month",
      status: "canceled",
      endDate: new Date("2024-01-01").toISOString(),
      stripeCustomerId: "cus_churned",
    });

    await expect(getTeamCustomers()).resolves.toEqual(
      new Map([
        ["cus_churned", { slug: account.slug, name: account.name ?? null }],
      ]),
    );
  });

  it("leaves out a personal account", async () => {
    // Whatever a personal account was invoiced is not this page's subject.
    await factory.UserAccount.create({ stripeCustomerId: "cus_personal" });

    await expect(getTeamCustomers()).resolves.toEqual(new Map());
  });

  it("leaves out a team that never reached Stripe", async () => {
    await factory.TeamAccount.create({ stripeCustomerId: null });

    await expect(getTeamCustomers()).resolves.toEqual(new Map());
  });
});

describe("getStaffRevenue", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("refuses a window the mirror never covered", async () => {
    // Months nobody backfilled would report zeros that read as real figures.
    await expect(getStaffRevenue(2)).rejects.toThrow(/does not cover/);

    // A sweep exists but is too shallow for the window asked.
    await factory.StripeInvoiceSync.create({
      sinceDate: new Date().toISOString(),
    });
    await expect(getStaffRevenue(2)).rejects.toThrow(/does not cover/);
  });

  it("reports the window from the mirror, split by interval", async () => {
    const now = new Date();
    const lastMonth = new Date(
      startOfUTCMonth(now, -1).getTime() + 5 * 24 * 3600 * 1000,
    );

    await factory.StripeInvoiceSync.create();
    const monthly = await createTeam({
      interval: "month",
      stripeCustomerId: "cus_staff_monthly",
    });
    const yearly = await createTeam({
      interval: "year",
      stripeCustomerId: "cus_staff_yearly",
    });
    // A churned team keeps the invoices it was already sent.
    const churned = await factory.TeamAccount.create({
      stripeCustomerId: "cus_staff_churned",
    });
    // A churned yearly team: its old annual bill must not spike a month.
    await factory.TeamAccount.create({
      stripeCustomerId: "cus_staff_churned_yearly",
    });

    await factory.StripeInvoice.create({
      stripeCustomerId: "cus_staff_monthly",
      stripeCreatedAt: lastMonth.toISOString(),
      billingReason: "subscription_cycle",
      currency: "eur",
      total: 50_000,
      totalExcludingTax: 50_000,
    });
    await factory.StripeInvoice.create({
      stripeCustomerId: "cus_staff_monthly",
      stripeCreatedAt: now.toISOString(),
      billingReason: "manual",
      currency: "eur",
      total: 10_000,
      totalExcludingTax: 10_000,
    });
    // A zero invoice is not a team being invoiced.
    await factory.StripeInvoice.create({
      stripeCustomerId: "cus_staff_monthly",
      stripeCreatedAt: lastMonth.toISOString(),
      currency: "eur",
      total: 0,
      totalExcludingTax: 0,
    });
    await factory.StripeInvoice.create({
      stripeCustomerId: "cus_staff_churned",
      stripeCreatedAt: lastMonth.toISOString(),
      billingReason: "manual",
      currency: "eur",
      total: 20_000,
      totalExcludingTax: 20_000,
    });
    // Not an Argos team: not this page's.
    await factory.StripeInvoice.create({
      stripeCustomerId: "cus_staff_random",
      stripeCreatedAt: lastMonth.toISOString(),
      currency: "eur",
      total: 99_900,
      totalExcludingTax: 99_900,
    });
    // The annual contract, covering twelve months from this month's start.
    await factory.StripeInvoice.create({
      stripeCustomerId: "cus_staff_yearly",
      stripeCreatedAt: startOfUTCMonth(now, 0).toISOString(),
      billingReason: "subscription_update",
      currency: "eur",
      total: 120_000,
      totalExcludingTax: 120_000,
      periodStart: startOfUTCMonth(now, 0).toISOString(),
      periodEnd: startOfUTCMonth(now, 12).toISOString(),
    });
    // The same team's monthly bill from before its conversion: history the
    // present interval must not erase.
    await factory.StripeInvoice.create({
      stripeCustomerId: "cus_staff_yearly",
      stripeCreatedAt: lastMonth.toISOString(),
      billingReason: "subscription_cycle",
      currency: "eur",
      total: 30_000,
      totalExcludingTax: 30_000,
    });
    // A churned yearly team's old renewal: an annual bill is never a month's
    // revenue, whoever it belongs to now.
    await factory.StripeInvoice.create({
      stripeCustomerId: "cus_staff_churned_yearly",
      stripeCreatedAt: lastMonth.toISOString(),
      billingReason: "subscription_cycle",
      currency: "eur",
      total: 480_000,
      totalExcludingTax: 480_000,
      periodStart: startOfUTCMonth(now, -13).toISOString(),
      periodEnd: startOfUTCMonth(now, -1).toISOString(),
    });

    const result = await getStaffRevenue(2);

    expect(result.months).toHaveLength(2);
    const [last, current] = result.months;
    invariant(last && current);

    expect(last.monthlyPlans).toEqual({
      revenue: 1000,
      teamsCount: 3,
      foreignRevenue: 0,
    });
    expect(last.teams.map((team) => [team.slug, team.revenue])).toEqual([
      [monthly.slug, 500],
      [yearly.slug, 300],
      [churned.slug, 200],
    ]);
    // The contract's coverage starts this month, so last month gets none of
    // it — amortized figures never move once a month is written.
    expect(last.yearlyPlans).toEqual({
      revenue: 0,
      teamsCount: 0,
      foreignRevenue: 0,
    });
    expect(last.revenue).toBe(1000);

    // The contract invoice lands in the running month, but an annual bill is
    // amortized over its coverage, never counted as the month's own revenue.
    expect(current.monthlyPlans.revenue).toBe(100);
    expect(current.teams).toHaveLength(1);
    const DAY = 24 * 3600 * 1000;
    const coveredDays =
      (startOfUTCMonth(now, 12).getTime() - startOfUTCMonth(now, 0).getTime()) /
      DAY;
    const currentMonthDays =
      (startOfUTCMonth(now, 1).getTime() - startOfUTCMonth(now, 0).getTime()) /
      DAY;
    expect(current.yearlyPlans.revenue).toBeCloseTo(
      (1200 * currentMonthDays) / coveredDays,
      8,
    );
    expect(current.yearlyPlans.teamsCount).toBe(1);

    expect(result.yearlyContracts).toHaveLength(1);
    const contract = result.yearlyContracts[0];
    invariant(contract);
    expect(contract.amount).toBe(1200);
    expect(contract.awaitingPayment).toBe(false);
    expect(contract.invoices).toHaveLength(1);
  });

  it("reports an open annual invoice as awaiting payment, counted", async () => {
    const now = new Date();
    await factory.StripeInvoiceSync.create();
    await createTeam({
      interval: "year",
      stripeCustomerId: "cus_staff_open",
    });
    await factory.StripeInvoice.create({
      stripeCustomerId: "cus_staff_open",
      stripeCreatedAt: now.toISOString(),
      status: "open",
      billingReason: "manual",
      currency: "eur",
      total: 120_000,
      totalExcludingTax: 120_000,
      periodStart: startOfUTCMonth(now, 0).toISOString(),
      periodEnd: startOfUTCMonth(now, 12).toISOString(),
    });

    const result = await getStaffRevenue(1);

    const contract = result.yearlyContracts[0];
    invariant(contract);
    expect(contract.amount).toBe(1200);
    expect(contract.awaitingPayment).toBe(true);
    const month = result.months[0];
    invariant(month);
    const DAY = 24 * 3600 * 1000;
    const coveredDays =
      (startOfUTCMonth(now, 12).getTime() - startOfUTCMonth(now, 0).getTime()) /
      DAY;
    const monthDays =
      (startOfUTCMonth(now, 1).getTime() - startOfUTCMonth(now, 0).getTime()) /
      DAY;
    expect(month.yearlyPlans.revenue).toBeCloseTo(
      (1200 * monthDays) / coveredDays,
      8,
    );
    expect(month.yearlyPlans.teamsCount).toBe(1);
  });
});
