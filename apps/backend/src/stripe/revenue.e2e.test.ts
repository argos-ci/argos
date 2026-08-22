import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { getBilledTeams } from "./revenue";

describe("getBilledTeams", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  let sequence = 0;

  /** A team on a Stripe subscription, as the revenue reader looks for it. */
  async function createTeam(options: {
    interval: "month" | "year";
    status?: "active" | "past_due" | "trialing" | "canceled";
    /** Set to grant the plan, which bills nothing. */
    granted?: boolean;
    /** Teams that never reached Stripe have no customer to match invoices on. */
    withCustomer?: boolean;
  }) {
    sequence += 1;
    const plan = await factory.Plan.create({
      usageBased: true,
      interval: options.interval,
      includedScreenshots: 1000,
    });
    const account = await factory.TeamAccount.create({
      stripeCustomerId:
        options.withCustomer === false ? null : `cus_revenue_${sequence}`,
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
      status: options.status ?? "active",
      trialEndDate:
        options.status === "trialing"
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : null,
    });
    return account;
  }

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
