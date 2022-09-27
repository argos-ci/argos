import { Purchase } from "@argos-ci/database/models";
import { transaction } from "@argos-ci/database";
import { getNewPlanOrThrow, getOrCreateAccount } from "./eventHelpers";

export async function updatePurchase(payload) {
  const [newPlan, account] = await Promise.all([
    getNewPlanOrThrow(payload),
    getOrCreateAccount(payload),
  ]);
  const activePurchase = await account.getActivePurchase();

  if (!activePurchase) {
    Purchase.query().insert({
      accountId: account.id,
      planId: newPlan.id,
      startDate: payload.effective_date,
    });
    return;
  }

  if (activePurchase.planId === payload.marketplace_purchase.plan.id) {
    return;
  }

  transaction(async (trx) => {
    await Promise.all([
      Purchase.query(trx)
        .patch({ endDate: payload.effective_date })
        .findById(activePurchase.id),
      Purchase.query(trx).insert({
        accountId: account.id,
        planId: newPlan.id,
        startDate: payload.effective_date,
      }),
    ]);
  });
}
