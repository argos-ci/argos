import { transaction } from "@/database/index.js";
import { Subscription } from "@/database/models/index.js";
import type { Account } from "@/database/models/index.js";

import { getGithubPlan } from "./eventHelpers.js";

export async function updateSubscription(
  payload: {
    effective_date?: string;
    marketplace_purchase: {
      plan?: { id: number };
      free_trial_ends_on: string | null;
    };
  },
  account: Account,
) {
  const plan = await getGithubPlan(payload);
  const manager = account.$getSubscriptionManager();
  const activeSubscription = await manager.getActiveSubscription();
  const effectiveDate = payload.effective_date || new Date().toISOString();

  if (!activeSubscription) {
    await Subscription.query().insert({
      accountId: account.id,
      planId: plan.id,
      startDate: effectiveDate,
      provider: "github",
      trialEndDate: payload.marketplace_purchase.free_trial_ends_on,
      paymentMethodFilled: true,
      status: "active",
    });
    return;
  }

  await activeSubscription.$fetchGraph("plan");

  if (
    activeSubscription.plan!.githubPlanId ===
    payload.marketplace_purchase.plan?.id
  ) {
    return;
  }

  transaction(async (trx) => {
    await Promise.all([
      Subscription.query(trx)
        .patch({
          endDate: effectiveDate,
          status: new Date(effectiveDate) > new Date() ? "canceled" : "active",
        })
        .findById(activeSubscription.id),
      Subscription.query(trx).insert({
        accountId: account.id,
        planId: plan.id,
        startDate: effectiveDate,
        provider: "github",
        status: "active",
        paymentMethodFilled: true,
      }),
    ]);
  });
}
