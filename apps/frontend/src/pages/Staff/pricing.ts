import { PlanInterval } from "@/gql/graphql";

/**
 * The plan every self-serve team lands on, and the one plan whose price is
 * public — which is why it is the only one an amount can be quoted against
 * without naming it.
 */
export const PRO_PLAN_NAME = "pro";

/**
 * What the staff pages need off a plan to put a price on a team.
 *
 * Structural rather than a generated type: the trial pipeline and the team
 * directory read the plan through two different documents, so the same fields
 * reach them under two different names.
 */
export type PricedPlan = {
  name: string;
  displayName: string;
  interval: PlanInterval;
};

/**
 * Monthly price to assume for a plan when the subscription carries no amount of
 * its own — one Stripe has not been asked about since Argos started reading the
 * amount, or that has none to give.
 *
 * These are guesses, and they are the reason the plan is named next to any
 * amount that is not Pro's. Enterprise is here because the alternative is worse:
 * with no entry at all a negotiated contract would fall back to the cheapest
 * plan we sell, and understate itself tenfold in a total that carries no
 * warning.
 */
/**
 * What Pro costs a month at list.
 *
 * The one amount on these pages nearly every team is billed, which is what
 * makes it worth leaving unprinted where a column would repeat it down every
 * row — and what makes an amount that is *not* it worth seeing.
 */
export const PRO_MONTHLY_PRICE = 100;

const FALLBACK_MONTHLY_PRICES: Record<string, number | undefined> = {
  [PRO_PLAN_NAME]: PRO_MONTHLY_PRICE,
  enterprise: 1000,
};

/** What a plan a team can land on costs, for the rows that need a guess. */
const DEFAULT_FALLBACK_MONTHLY_PRICE = 100;

export function getFallbackMonthlyPrice(plan: PricedPlan): number {
  return FALLBACK_MONTHLY_PRICES[plan.name] ?? DEFAULT_FALLBACK_MONTHLY_PRICE;
}

/**
 * An amount stated for one billing period, read as a monthly one.
 *
 * Stripe states every amount per period — the plan's price and the overage
 * alike — and a yearly subscription's period is a year. The staff tables compare
 * teams against each other, so they hold one unit: the month.
 */
export function toMonthlyAmount(amount: number, plan: PricedPlan): number {
  return plan.interval === PlanInterval.Year ? amount / 12 : amount;
}

/**
 * What the plan costs per month.
 *
 * Read from Stripe and stored on the subscription, so a negotiated contract
 * quotes its own amount rather than a constant of ours. The fallbacks are
 * already monthly figures, which is why only the stored amount is converted.
 */
export function getMonthlyFlatPrice(
  flatPrice: number | null,
  plan: PricedPlan,
): number {
  return flatPrice === null
    ? getFallbackMonthlyPrice(plan)
    : toMonthlyAmount(flatPrice, plan);
}

/**
 * What the plan costs over one billing period, in that period's own unit.
 *
 * The counterpart of `getMonthlyFlatPrice`, for a column that reports periods
 * rather than a monthly rate: a yearly subscription's period is a year, and its
 * amount is the year's. Stripe already states the stored amount that way, so it
 * is the guessed fallback that has to be scaled up instead.
 */
export function getPeriodFlatPrice(
  flatPrice: number | null,
  plan: PricedPlan,
): number {
  if (flatPrice !== null) {
    return flatPrice;
  }

  const monthly = getFallbackMonthlyPrice(plan);
  return plan.interval === PlanInterval.Year ? monthly * 12 : monthly;
}

/**
 * Every amount on the staff pages is printed in dollars, whatever the
 * subscription is billed in — the currency Argos reports revenue in. A euro
 * contract is therefore read at parity rather than converted, which is close
 * enough for an internal view and far clearer than a column mixing two
 * currencies it cannot total.
 */
const PRICE_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return PRICE_FORMAT.format(amount);
}
