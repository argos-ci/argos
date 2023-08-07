import { transaction } from "@argos-ci/database";
import { Purchase } from "@argos-ci/database/models";
import type { Account } from "@argos-ci/database/models";

import { getGithubPlan } from "./eventHelpers.js";

export const updatePurchase = async (
  payload: {
    effective_date?: string;
    marketplace_purchase: {
      plan?: { id: number };
      free_trial_ends_on: string | null;
    };
  },
  account: Account,
) => {
  const plan = await getGithubPlan(payload);
  const activePurchase = await account.$getActivePurchase();
  const effectiveDate = payload.effective_date || new Date().toISOString();

  if (!activePurchase) {
    await Purchase.query().insert({
      accountId: account.id,
      planId: plan.id,
      startDate: effectiveDate,
      source: "github",
      trialEndDate: payload.marketplace_purchase.free_trial_ends_on,
    });
    return;
  }

  await activePurchase.$fetchGraph("plan");

  if (activePurchase.plan!.githubId === payload.marketplace_purchase.plan?.id) {
    return;
  }

  transaction(async (trx) => {
    await Promise.all([
      Purchase.query(trx)
        .patch({ endDate: effectiveDate })
        .findById(activePurchase.id),
      Purchase.query(trx).insert({
        accountId: account.id,
        planId: plan.id,
        startDate: effectiveDate,
        source: "github",
      }),
    ]);
  });
};
