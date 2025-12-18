import { transaction } from "@/database";
import { Subscription } from "@/database/models";
import type { Account } from "@/database/models";
import { notifySubscriptionStatusUpdate } from "@/database/services/subscription";

import { getGithubPlan } from "./eventHelpers";

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
    const subscriptionData = {
      accountId: account.id,
      planId: plan.id,
      startDate: effectiveDate,
      provider: "github" as const,
      trialEndDate: payload.marketplace_purchase.free_trial_ends_on,
      paymentMethodFilled: true,
      status: "active" as const,
    };
    await Promise.all([
      Subscription.query().insert(subscriptionData),
      notifySubscriptionStatusUpdate({
        provider: "github",
        status: subscriptionData.status,
        account,
      }),
    ]);
    return;
  }

  await activeSubscription.$fetchGraph("plan");

  if (
    activeSubscription.plan!.githubPlanId ===
    payload.marketplace_purchase.plan?.id
  ) {
    return;
  }

  const subscriptionData = {
    accountId: account.id,
    planId: plan.id,
    startDate: effectiveDate,
    provider: "github" as const,
    status: "active" as const,
    paymentMethodFilled: true,
  };
  await Promise.all([
    transaction(async (trx) => {
      await Promise.all([
        Subscription.query(trx)
          .patch({
            endDate: effectiveDate,
            status:
              new Date(effectiveDate) > new Date() ? "canceled" : "active",
          })
          .findById(activeSubscription.id),
        Subscription.query(trx).insert(subscriptionData),
      ]);
    }),
    notifySubscriptionStatusUpdate({
      provider: "github",
      status: subscriptionData.status,
      account,
    }),
  ]);
}
