import { Plan } from "@/database/models";

import { getAppOctokit } from "./client";

/**
 * Copy the Marketplace listing's plan prices onto the plans table.
 *
 * GitHub exposes no seller invoice API, so the marketplace book cannot be
 * mirrored the way the Stripe one is: what exists is the listing's plans and
 * their current prices, which the revenue page multiplies the active
 * marketplace subscriptions by. A price change rewrites how past months are
 * priced — accepted, marketplace prices barely ever move.
 */
export async function syncGithubMarketplacePlanPrices(): Promise<number> {
  const octokit = getAppOctokit({ app: "main", proxy: false });
  const plans = await octokit.paginate("GET /marketplace_listing/plans", {
    per_page: 100,
  });

  // Cleared first: a plan the listing no longer carries has no price any more,
  // and leaving the last one known would keep pricing its subscribers off a
  // tariff that does not exist.
  await Plan.query()
    .patch({ githubMonthlyPriceCents: null })
    .whereNotNull("githubPlanId")
    .whereNotIn(
      "githubPlanId",
      plans.map((listingPlan) => listingPlan.id),
    );

  let count = 0;
  for (const listingPlan of plans) {
    count += await Plan.query()
      .patch({ githubMonthlyPriceCents: listingPlan.monthly_price_in_cents })
      .where("githubPlanId", listingPlan.id);
  }
  return count;
}
