import { invariant } from "@argos/util/invariant";

import { checkHasStripeDiscount } from "@/stripe/discount";
import { toEuros } from "@/stripe/revenue";

import { Account, Plan, Subscription } from "../models";
import { getPeriodAmount } from "./period-amount";
import {
  getAccountBillings,
  getScreenshotTotals,
  type AccountBilling,
} from "./period-usage";

/**
 * What one billing period of a Pro plan comes to, before tax, from which the
 * team is offered an Enterprise plan: past it, volume pricing costs the team
 * less than Pro does.
 */
const ENTERPRISE_OFFER_THRESHOLD_USD = 1500;

/**
 * The threshold in the currency the subscription bills in. Euros convert at the
 * fixed rate the revenue page uses, so a team billed in euros is offered
 * Enterprise at the same spend as one billed in dollars.
 */
function getThreshold(currency: Subscription["currency"]): number {
  return currency === "eur"
    ? toEuros({ amount: ENTERPRISE_OFFER_THRESHOLD_USD, currency: "usd" })
    : ENTERPRISE_OFFER_THRESHOLD_USD;
}

/**
 * What the Pro plan charges per screenshot past its quota, as the pricing page
 * lists it, the same in dollars and euros. Change them with the pricing page:
 * a subscription billed below either one is read as negotiated.
 */
const PRO_LIST_PRICES = {
  screenshot: 0.004,
  storybookScreenshot: 0.0015,
};

/**
 * Whether the subscription is on Pro billed monthly at its list prices. A team
 * billed below them has a negotiated deal: it already talked to sales, and
 * offering it a better price than Pro would read as if it had not. The
 * threshold is a month's bill, and a yearly plan's period is a year.
 */
function checkIsMonthlyListPricedPro(subscription: Subscription): boolean {
  if (
    !subscription.plan ||
    !Plan.checkIsProPlan(subscription.plan) ||
    subscription.plan.interval !== "month"
  ) {
    return false;
  }
  const screenshotPrice = subscription.additionalScreenshotPrice;
  // A Storybook screenshot without a price of its own is billed as any other.
  const storybookScreenshotPrice =
    subscription.additionalStorybookScreenshotPrice ?? screenshotPrice;
  return (
    (screenshotPrice === null ||
      screenshotPrice >= PRO_LIST_PRICES.screenshot) &&
    (storybookScreenshotPrice === null ||
      storybookScreenshotPrice >= PRO_LIST_PRICES.storybookScreenshot)
  );
}

/**
 * Whether a team on this subscription and billing is offered Enterprise: it is
 * on Pro billed monthly at list prices with no discount, and its running or its
 * previous billing period reached the threshold. The previous one keeps the
 * offer up while a new period starts again from zero.
 */
async function checkIsEnterpriseOfferDue(input: {
  subscription: Subscription;
  billing: AccountBilling;
}): Promise<boolean> {
  const { subscription, billing } = input;
  if (
    !checkIsMonthlyListPricedPro(subscription) ||
    !billing.plan ||
    !Plan.checkIsProPlan(billing.plan)
  ) {
    return false;
  }
  const threshold = getThreshold(subscription.currency);
  const reached = (["current", "previous"] as const).some((period) => {
    const amount = getPeriodAmount(billing, period);
    return amount !== null && amount >= threshold;
  });
  if (!reached) {
    return false;
  }
  // A coupon is a deal too. Stripe is asked last, so only the few teams past
  // the threshold wait on it.
  return !(await checkHasStripeDiscount(subscription));
}

/** Whether the Billing page offers the team an Enterprise plan. */
export async function getIsEnterpriseOfferShown(
  account: Account,
): Promise<boolean> {
  // Telling a Pro team apart costs one query, pricing its periods an aggregate.
  const subscription = await account
    .$getSubscriptionManager()
    .getActiveSubscription();
  if (!subscription || !checkIsMonthlyListPricedPro(subscription)) {
    return false;
  }
  const billings = await getAccountBillings([account]);
  const billing = billings.get(account.id);
  invariant(billing, "every requested account has a billing");
  return checkIsEnterpriseOfferDue({ subscription, billing });
}

/**
 * A team with the subscription it is listed on, priced.
 *
 * @graphqlType mapped to `StaffEnterpriseContract` in `codegen.ts`.
 */
export type StaffEnterpriseTeam = {
  subscription: Subscription;
  billing: AccountBilling;
};

/**
 * A team on the Enterprise trial plan, with what it used this month.
 *
 * @graphqlType mapped to `StaffEnterpriseTrial` in `codegen.ts`.
 */
export type StaffEnterpriseTrial = {
  account: Account;
  plan: Plan;
  periodStart: Date;
  periodEnd: Date;
  periodScreenshots: number;
};

/** What the staff Enterprise page lists. */
export type StaffEnterprise = {
  /** Teams on an Enterprise plan, monthly and yearly. */
  contracts: StaffEnterpriseTeam[];
  /** Pro teams the Billing page offers an Enterprise plan to. */
  candidates: StaffEnterpriseTeam[];
  /** Teams on the Enterprise trial plan. */
  trials: StaffEnterpriseTrial[];
};

/**
 * The teams staff granted the Enterprise trial plan, with the screenshots they
 * used since the month opened: a granted plan's period is the calendar month,
 * as the subscription manager counts it.
 */
async function getEnterpriseTrials(): Promise<StaffEnterpriseTrial[]> {
  // A handful of plans: reading them all keeps the name rule in one place.
  const trialPlans = (await Plan.query()).filter((plan) =>
    Plan.checkIsEnterpriseTrialPlan(plan),
  );
  if (trialPlans.length === 0) {
    return [];
  }
  const accounts = await Account.query()
    .whereNotNull("teamId")
    .whereIn(
      "forcedPlanId",
      trialPlans.map((plan) => plan.id),
    );
  if (accounts.length === 0) {
    return [];
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const totals = await getScreenshotTotals(
    accounts.map((account) => ({
      accountId: account.id,
      index: 0,
      from: periodStart,
      to: now,
    })),
  );
  const planById = new Map(trialPlans.map((plan) => [plan.id, plan]));

  return accounts.map((account) => {
    const plan = account.forcedPlanId
      ? planById.get(account.forcedPlanId)
      : undefined;
    invariant(plan, "a trial account is on a trial plan");
    return {
      account,
      plan,
      periodStart,
      periodEnd,
      periodScreenshots: totals.get(account.id)?.get(0)?.all ?? 0,
    };
  });
}

/**
 * The teams on an Enterprise plan, the Pro teams the Billing page offers one
 * to, priced in one batch, and the teams trying Enterprise.
 *
 * Each team account is read on the subscription `getActiveSubscription` picks,
 * the one with the largest quota among those running, so the page and the
 * Billing card agree on which plan a team is on. A granted plan bills nothing,
 * so its team is left out.
 */
export async function getStaffEnterprise(): Promise<StaffEnterprise> {
  const [running, trials] = await Promise.all([
    Subscription.query()
      .select("subscriptions.*")
      .withGraphFetched("[plan, account]")
      .joinRelated("[plan, account]")
      .whereNotNull("account.teamId")
      .whereNull("account.forcedPlanId")
      .whereRaw("?? < now()", "subscriptions.startDate")
      .whereIn("subscriptions.status", ["active", "trialing", "past_due"])
      .where((query) =>
        query
          .whereNull("subscriptions.endDate")
          .orWhereRaw("?? >= now()", "subscriptions.endDate"),
      )
      .distinctOn("subscriptions.accountId")
      .orderBy("subscriptions.accountId")
      .orderBy("plan.includedScreenshots", "DESC"),
    getEnterpriseTrials(),
  ]);

  const contracts = running.filter((subscription) =>
    Plan.checkIsEnterprisePlan(subscription.plan),
  );
  // Pricing a period is the expensive part, so only monthly Pro at list
  // prices gets priced.
  const candidates = running.filter(checkIsMonthlyListPricedPro);
  const billings = await getAccountBillings(
    [...contracts, ...candidates].map((subscription) => subscription.account),
  );
  const withBilling = (subscription: Subscription): StaffEnterpriseTeam => {
    const billing = billings.get(subscription.accountId);
    invariant(billing, "every requested account has a billing");
    return { subscription, billing };
  };

  const offered = await Promise.all(
    candidates.map(async (subscription) => {
      const team = withBilling(subscription);
      return (await checkIsEnterpriseOfferDue(team)) ? team : null;
    }),
  );

  return {
    contracts: contracts.map(withBilling),
    candidates: offered.filter((team) => team !== null),
    trials,
  };
}
