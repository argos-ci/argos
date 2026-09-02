import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { factory, setupDatabase } from "@/database/testing";
import { startOfUTCMonth } from "@/util/utc-month";

import {
  getBilledTeams,
  getStaffRevenue,
  getStaffRevenueMonthTeams,
  getTeamCustomers,
  toEuros,
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
        [
          "cus_churned",
          {
            accountId: account.id,
            slug: account.slug,
            name: account.name ?? null,
          },
        ],
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
    await expect(getStaffRevenue(2)).rejects.toThrow(/never swept deep enough/);

    // A sweep exists but is too shallow for the window asked.
    await factory.StripeInvoiceSync.create({
      sinceDate: new Date().toISOString(),
    });
    await expect(getStaffRevenue(2)).rejects.toThrow(/never swept deep enough/);
  });

  it("refuses figures from a mirror nothing reconciles any more", async () => {
    // Deep enough, but the sweep stopped running: what it holds has drifted
    // from Stripe by however long it has been silent.
    await factory.StripeInvoiceSync.create({
      sinceDate: new Date("2020-01-01").toISOString(),
      completedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    });

    await expect(getStaffRevenue(2)).rejects.toThrow(/has not been swept/);
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
    // A team that has left keeps paying for the months its contract bought.
    const churnedYearly = await factory.TeamAccount.create({
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
    // Billed by hand, a month at a time — a legacy deal, not a contract.
    await factory.StripeInvoice.create({
      stripeCustomerId: "cus_staff_churned",
      stripeCreatedAt: lastMonth.toISOString(),
      billingReason: "manual",
      currency: "eur",
      total: 20_000,
      totalExcludingTax: 20_000,
      periodStart: startOfUTCMonth(now, -1).toISOString(),
      periodEnd: startOfUTCMonth(now, 0).toISOString(),
    });
    // Not an Argos team: not this page's.
    await factory.StripeInvoice.create({
      stripeCustomerId: "cus_staff_random",
      stripeCreatedAt: lastMonth.toISOString(),
      currency: "eur",
      total: 99_900,
      totalExcludingTax: 99_900,
    });
    // The term before this one: last month is paid for by it, so the months
    // before a renewal must not fall to zero.
    await factory.StripeInvoice.create({
      stripeCustomerId: "cus_staff_yearly",
      stripeCreatedAt: startOfUTCMonth(now, -12).toISOString(),
      billingReason: "subscription_cycle",
      currency: "eur",
      total: 120_000,
      totalExcludingTax: 120_000,
      periodStart: startOfUTCMonth(now, -12).toISOString(),
      periodEnd: startOfUTCMonth(now, 0).toISOString(),
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
      periodStart: startOfUTCMonth(now, -1).toISOString(),
      periodEnd: startOfUTCMonth(now, 11).toISOString(),
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
    // The teams behind the month are read on their own, a month at a time.
    const lastMonthTeams = await getStaffRevenueMonthTeams(
      startOfUTCMonth(now, -1),
    );
    expect(lastMonthTeams.map((team) => [team.slug, team.revenue])).toEqual([
      [monthly.slug, 500],
      [yearly.slug, 300],
      [churned.slug, 200],
    ]);
    // Two contracts pay for last month: the term before this team's newest
    // renewal — a contract does not begin at whichever bill is latest — and
    // the churned team's, which keeps paying for the months it bought
    // whatever its subscription says today.
    expect(last.yearlyPlans.teamsCount).toBe(2);
    expect(last.yearlyPlans.revenue).toBeGreaterThan(0);
    expect(last.revenue).toBe(1000 + last.yearlyPlans.revenue);

    // The running month is only as long as it has been, so a contract's share
    // of it is as partial as the invoices beside it.
    expect(current.monthlyPlans.revenue).toBe(100);
    expect(current.monthlyPlans.teamsCount).toBe(1);
    await expect(
      getStaffRevenueMonthTeams(startOfUTCMonth(now, 0)),
    ).resolves.toHaveLength(1);
    const elapsed = now.getTime() - startOfUTCMonth(now, 0).getTime();
    const currentTerm =
      startOfUTCMonth(now, 12).getTime() - startOfUTCMonth(now, 0).getTime();
    const churnedTerm =
      startOfUTCMonth(now, 11).getTime() - startOfUTCMonth(now, -1).getTime();
    expect(current.yearlyPlans.revenue).toBeCloseTo(
      (1200 * elapsed) / currentTerm + (4800 * elapsed) / churnedTerm,
      3,
    );
    expect(current.yearlyPlans.teamsCount).toBe(2);

    // Both contracts are in force, largest first, each with the invoice its
    // figure is read from.
    expect(
      result.yearlyContracts.map((contract) => [
        contract.slug,
        contract.amount,
      ]),
    ).toEqual([
      [churnedYearly.slug, 4800],
      [yearly.slug, 1200],
    ]);
    const contract = result.yearlyContracts[1];
    invariant(contract);
    expect(contract.awaitingPayment).toBe(false);
    expect(contract.invoices).toHaveLength(1);
    // A whole month of it, not the part of the running month that has gone by.
    const runningMonth =
      startOfUTCMonth(now, 1).getTime() - startOfUTCMonth(now, 0).getTime();
    expect(contract.monthlyRevenue).toBeCloseTo(
      (1200 * runningMonth) / currentTerm,
      3,
    );

    // The projection carries the same contracts to the end of the month, where
    // the month itself stops at today — that difference is what it exists for.
    expect(result.projection.yearlyPlans).toBeCloseTo(
      (1200 * runningMonth) / currentTerm + (4800 * runningMonth) / churnedTerm,
      3,
    );
    expect(result.projection.yearlyPlans).toBeGreaterThan(
      current.yearlyPlans.revenue,
    );
  });

  it("estimates the running month's bills that have not been raised", async () => {
    // A cycle that falls later in the month has invoiced nothing yet, and the
    // month would read as if the team had left. This is the line that says
    // otherwise, priced off the usage the period has accumulated — the same
    // reading the team directory prices it at.
    //
    // The clock is pinned to the middle of the month because that is the whole
    // subject: which side of the month's end a cycle falls on decides whether
    // it is this month's bill, and a suite run on the 31st would have no day
    // left to place one in. Only `Date` is faked — the pool's timers have to
    // keep running, and Postgres keeps its own clock either way.
    vi.useFakeTimers({ toFake: ["Date"] });
    const realNow = new Date();
    vi.setSystemTime(
      new Date(
        Date.UTC(realNow.getUTCFullYear(), realNow.getUTCMonth(), 15, 12),
      ),
    );

    try {
      const now = new Date();
      await factory.StripeInvoiceSync.create();

      const plan = await factory.Plan.create({
        usageBased: true,
        interval: "month",
        includedScreenshots: 1000,
      });
      const user = await factory.User.create();

      /** A team billed on `dayOfMonth`, with the usage its bill will read. */
      const createPendingTeam = async (team: {
        slug: string;
        dayOfMonth: number;
        screenshotCount: number;
      }) => {
        const account = await factory.TeamAccount.create({
          stripeCustomerId: `cus_${team.slug}`,
        });
        // A month back, so the period the anniversary anchors is the one
        // running now.
        const startDate = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth() - 1,
            team.dayOfMonth,
            9,
          ),
        ).toISOString();
        await factory.Subscription.create({
          accountId: account.id,
          planId: plan.id,
          currency: "eur",
          provider: "stripe",
          stripeSubscriptionId: `sub_${team.slug}`,
          subscriberId: user.id,
          startDate,
          createdAt: startDate,
          status: "active",
          flatPrice: 100,
          additionalScreenshotPrice: 0.01,
        });
        const project = await factory.Project.create({ accountId: account.id });
        await factory.ScreenshotBucket.create({
          projectId: project.id,
          screenshotCount: team.screenshotCount,
          createdAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
        });
        return { account, stripeCustomerId: `cus_${team.slug}` };
      };

      const pending = await createPendingTeam({
        slug: "staff_pending",
        // The 20th, so its period closes inside this month and after today.
        dayOfMonth: 20,
        screenshotCount: 3000,
      });
      // The 10th: its cycle already came round this month, and the next one
      // falls in the month after. Whatever it was billed on the 10th is a fact
      // of this month that the mirror carries — or does not, when a sweep is
      // behind or the invoice is still a draft — but the bill this period ends
      // on belongs to next month either way.
      await createPendingTeam({
        slug: "staff_billed_already",
        dayOfMonth: 10,
        screenshotCount: 9000,
      });

      // Raised mid-month on the pending team, and not by its cycle: an upgrade
      // prorated on the spot. Its own bill is still due on the 20th, so the
      // month has both to report — the proration as invoiced, the cycle as
      // estimated.
      await factory.StripeInvoice.create({
        stripeCustomerId: pending.stripeCustomerId,
        stripeCreatedAt: now.toISOString(),
        billingReason: "subscription_update",
        currency: "eur",
        total: 1_200,
        totalExcludingTax: 1_200,
      });

      const result = await getStaffRevenue(1);
      const current = result.months[0];
      invariant(current);
      // The team billed on the 10th is nowhere: its cycle has come round, and
      // the next one belongs to the month after. The pending team is there
      // twice — the proration it was sent, and the bill it is still owed.
      const teams = await getStaffRevenueMonthTeams(now);
      expect(teams.map((team) => team.slug)).toEqual([
        pending.account.slug,
        pending.account.slug,
      ]);
      const line = teams.find((team) => team.estimatedAt !== null);
      invariant(line);

      // The plan's own amount, plus the two thousand screenshots past the quota.
      expect(line.amount).toBe(120);
      expect(line.revenue).toBe(120);
      expect(line.screenshotsCount).toBe(3000);
      expect(line.invoices).toEqual([]);
      expect(line.estimatedAt).toBeInstanceOf(Date);
      // An estimate is not revenue: the month reports what was invoiced, which
      // here is the proration alone.
      expect(current.monthlyPlans).toEqual({
        revenue: 12,
        teamsCount: 1,
        foreignRevenue: 0,
      });
      // Where the month is heading is the other question: the proration it has
      // been sent, and the cycle bill it has not.
      expect(result.projection.monthlyPlans).toBe(132);
      expect(result.projection.estimated).toBe(120);
      expect(result.projection.revenue).toBe(132);
    } finally {
      vi.useRealTimers();
    }
  });

  it("lists a contract that ran out mid-month, so the table adds up", async () => {
    // It paid for the days before it ended, so it is in the month's figure —
    // and a table that left it out would come up short against the card it
    // exists to explain.
    const now = new Date();
    await factory.StripeInvoiceSync.create({
      sinceDate: new Date("2020-01-01").toISOString(),
    });
    await createTeam({
      interval: "year",
      stripeCustomerId: "cus_staff_expired",
    });
    const endedOn = new Date(
      startOfUTCMonth(now, 0).getTime() + 10 * 24 * 3600 * 1000,
    );
    await factory.StripeInvoice.create({
      stripeCustomerId: "cus_staff_expired",
      stripeCreatedAt: startOfUTCMonth(now, -12).toISOString(),
      billingReason: "subscription_cycle",
      currency: "eur",
      total: 120_000,
      totalExcludingTax: 120_000,
      periodStart: startOfUTCMonth(now, -12).toISOString(),
      periodEnd: endedOn.toISOString(),
    });

    const result = await getStaffRevenue(1);

    const month = result.months[0];
    invariant(month);
    const listed = result.yearlyContracts.reduce(
      (sum, contract) => sum + contract.monthlyRevenue,
      0,
    );
    // The table reports whole months and the month is still running, so the
    // figure it explains is the smaller of the two — never the other way
    // round, which would mean a contributor missing from the list.
    expect(listed).toBeGreaterThanOrEqual(month.yearlyPlans.revenue);
    expect(
      result.yearlyContracts.map((contract) => contract.slug),
    ).toContainEqual(expect.any(String));
    expect(result.yearlyContracts).toHaveLength(1);
  });

  it("never spreads a contract for more than it was raised for", async () => {
    // The invariant the arithmetic rests on: an invoice pays for its own term
    // at its own rate, so what it puts into the months of a window can only
    // ever be a part of what it was raised for — a term cut short by an early
    // renewal delivers less, never the same amount faster.
    const now = new Date();
    await factory.StripeInvoiceSync.create({
      sinceDate: new Date("2020-01-01").toISOString(),
    });
    await createTeam({
      interval: "year",
      stripeCustomerId: "cus_staff_early",
    });
    // A year's contract, then a renewal five months in: the first term is cut
    // short, and five months of it is all it can ever have delivered.
    await factory.StripeInvoice.create({
      stripeCustomerId: "cus_staff_early",
      stripeCreatedAt: startOfUTCMonth(now, -11).toISOString(),
      billingReason: "subscription_cycle",
      currency: "eur",
      total: 1_200_000,
      totalExcludingTax: 1_200_000,
      periodStart: startOfUTCMonth(now, -11).toISOString(),
      periodEnd: startOfUTCMonth(now, 1).toISOString(),
    });
    await factory.StripeInvoice.create({
      stripeCustomerId: "cus_staff_early",
      stripeCreatedAt: startOfUTCMonth(now, -6).toISOString(),
      billingReason: "subscription_cycle",
      currency: "eur",
      total: 2_400_000,
      totalExcludingTax: 2_400_000,
      periodStart: startOfUTCMonth(now, -6).toISOString(),
      periodEnd: startOfUTCMonth(now, 6).toISOString(),
    });

    const result = await getStaffRevenue(12);

    const spread = result.months.reduce(
      (sum, month) => sum + month.yearlyPlans.revenue,
      0,
    );
    // Both invoices come to €36,000; a window of twelve months can hold only
    // part of that, and the first term must contribute at its own rate — a
    // fifth of €12,000 over five months, not the whole of it.
    expect(spread).toBeLessThan(36_000);
    const firstTermRate = 12_000 / 12;
    const monthsOfFirstTerm = result.months.slice(0, 5);
    for (const month of monthsOfFirstTerm) {
      expect(month.yearlyPlans.revenue).toBeLessThan(firstTermRate * 1.2);
    }
  });

  it("prices each month's marketplace book from the subscriptions it ran", async () => {
    const now = new Date();
    await factory.StripeInvoiceSync.create({
      sinceDate: new Date("2020-01-01").toISOString(),
    });
    const plan = await factory.Plan.create({
      usageBased: false,
      githubMonthlyPriceCents: 10_000,
    });
    const user = await factory.User.create();

    async function subscribe(options: { endDate?: string; planId?: string }) {
      const account = await factory.TeamAccount.create({});
      await factory.Subscription.create({
        accountId: account.id,
        planId: options.planId ?? plan.id,
        provider: "github",
        subscriberId: user.id,
        startDate: startOfUTCMonth(now, -6).toISOString(),
        endDate: options.endDate ?? null,
        status: "active",
      });
    }

    // One still running, and one that left when this month opened: the months
    // it ran through earned what it was subscribed for, whatever it does now.
    await subscribe({});
    await subscribe({ endDate: startOfUTCMonth(now, 0).toISOString() });
    // An unpriced plan is not a marketplace listing, so it counts nothing.
    const unpriced = await factory.Plan.create({ usageBased: true });
    await subscribe({ planId: unpriced.id });

    const result = await getStaffRevenue(2);
    const [last, current] = result.months;
    invariant(last && current);

    expect(last.githubPlans.teamsCount).toBe(2);
    expect(last.githubPlans.revenue).toBe(
      toEuros({ amount: 200, currency: "usd" }),
    );
    // The one that left is gone from this month, and only from this one —
    // and what the month has earned so far is the share of it gone by, like
    // the two figures beside it.
    expect(current.githubPlans.teamsCount).toBe(1);
    const monthMs =
      startOfUTCMonth(now, 1).getTime() - startOfUTCMonth(now, 0).getTime();
    const elapsed = now.getTime() - startOfUTCMonth(now, 0).getTime();
    expect(current.githubPlans.revenue).toBeCloseTo(
      toEuros({ amount: 100 * (elapsed / monthMs), currency: "usd" }),
      3,
    );
    // Inside the figure the cards report, like the two beside it: the card
    // states one amount and prints the three under it.
    expect(current.revenue).toBe(
      current.monthlyPlans.revenue +
        current.yearlyPlans.revenue +
        current.githubPlans.revenue,
    );
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
    const elapsed = now.getTime() - startOfUTCMonth(now, 0).getTime();
    const term =
      startOfUTCMonth(now, 12).getTime() - startOfUTCMonth(now, 0).getTime();
    expect(month.yearlyPlans.revenue).toBeCloseTo((1200 * elapsed) / term, 3);
    expect(month.yearlyPlans.teamsCount).toBe(1);
  });

  it("projects where a contract's term lands at the rate it has run at", async () => {
    // What a renewal is argued over: a customer already past the quota it was
    // sold is one nobody should be re-signing at last year's price, and the
    // figure to open the conversation with is where the year lands, not where
    // it stands today.
    //
    // The clock is pinned to the exact middle of a calendar year and the
    // subscription anchored to its first day, so the term has run for exactly
    // half of itself: a trend carried forward doubles, and every figure below
    // comes out exact rather than approximate. Only `Date` is faked — the
    // pool's timers have to keep running, and Postgres keeps its own clock.
    vi.useFakeTimers({ toFake: ["Date"] });
    const year = new Date().getFullYear();
    const termStart = new Date(year, 0, 1);
    const termEnd = new Date(year + 1, 0, 1);
    vi.setSystemTime(new Date((termStart.getTime() + termEnd.getTime()) / 2));

    try {
      await factory.StripeInvoiceSync.create({
        sinceDate: new Date("2020-01-01").toISOString(),
      });

      const plan = await factory.Plan.create({
        usageBased: true,
        interval: "year",
        includedScreenshots: 400,
      });
      const account = await factory.TeamAccount.create({
        stripeCustomerId: "cus_staff_term",
      });
      const user = await factory.User.create();
      const anchoredAt = new Date(year - 2, 0, 1).toISOString();
      await factory.Subscription.create({
        accountId: account.id,
        planId: plan.id,
        currency: "eur",
        provider: "stripe",
        stripeSubscriptionId: "sub_staff_term",
        subscriberId: user.id,
        // The first day of a year, so the anniversary the term opens on is the
        // first day of this one.
        startDate: anchoredAt,
        createdAt: anchoredAt,
        status: "active",
        flatPrice: 1200,
        additionalScreenshotPrice: 0.01,
      });
      const project = await factory.Project.create({ accountId: account.id });
      await factory.ScreenshotBucket.create({
        projectId: project.id,
        screenshotCount: 1000,
        createdAt: new Date(
          termStart.getTime() + 24 * 3600 * 1000,
        ).toISOString(),
      });
      await factory.StripeInvoice.create({
        stripeCustomerId: "cus_staff_term",
        stripeCreatedAt: termStart.toISOString(),
        billingReason: "subscription_cycle",
        currency: "eur",
        total: 120_000,
        totalExcludingTax: 120_000,
        periodStart: termStart.toISOString(),
        periodEnd: termEnd.toISOString(),
      });

      const result = await getStaffRevenue(1);

      const contract = result.yearlyContracts[0];
      invariant(contract);
      const { usage } = contract;
      invariant(usage);
      expect(usage.periodFrom.getTime()).toBe(termStart.getTime());
      expect(usage.periodEndsAt.getTime()).toBe(termEnd.getTime());
      expect(usage.screenshotsCount).toBe(1000);
      expect(usage.includedScreenshots).toBe(400);
      // Six hundred past the quota, at a cent each.
      expect(usage.additionalCost).toBeCloseTo(6, 6);
      // Half a year gone, so that overage has averaged a euro a month.
      expect(usage.monthlyAdditionalCost).toBeCloseTo(1, 6);
      // Half the term gone, so the year doubles what it has run up — and the
      // overage is what is left of that once the quota is taken off, priced at
      // the rate the term has already been billed at.
      expect(usage.projectedScreenshotsCount).toBe(2000);
      expect(usage.projectedAdditionalCost).toBeCloseTo(16, 6);

      // The overage reaches the month's yearly band beside the contract, and on
      // its own denominator: the contract is spread over the term it pays for,
      // the overage over the stretch of that term it has accrued in.
      const month = result.months[0];
      invariant(month);
      const monthStart = startOfUTCMonth(new Date(), 0).getTime();
      const elapsedInMonth = Date.now() - monthStart;
      const contractShare =
        (1200 * elapsedInMonth) / (termEnd.getTime() - termStart.getTime());
      const overageShare =
        (6 * elapsedInMonth) / (Date.now() - termStart.getTime());
      expect(month.yearlyPlans.revenue).toBeCloseTo(
        contractShare + overageShare,
        6,
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
