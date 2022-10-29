import { transaction } from "@argos-ci/database";
import { Purchase } from "@argos-ci/database/models";

import { getNewPlanOrThrow } from "./eventHelpers";

export async function updatePurchase(payload, account) {
  const plan = await getNewPlanOrThrow(payload);
  const activePurchase = await account.getActivePurchase();
  const effectiveDate = payload.effective_date || new Date().toISOString();

  if (!activePurchase) {
    Purchase.query().insert({
      accountId: account.id,
      planId: plan.id,
      startDate: effectiveDate,
    });
    return;
  }

  if (activePurchase.plan.githubId === payload.marketplace_purchase.plan.id) {
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
      }),
    ]);
  });
}
