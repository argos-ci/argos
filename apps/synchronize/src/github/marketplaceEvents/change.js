/* eslint-disable default-case */
import { Purchase } from "@argos-ci/database/models";
import {
  getActivePurchaseOrThrow,
  getOrCreatePurchase,
  getPlanOrThrow,
} from "./helpers";

export async function change(payload) {
  const swapDate =
    payload.action === "changed"
      ? new Date().toISOString()
      : payload.marketplace_purchase.next_billing_date;

  const nextPlan = await getPlanOrThrow(payload);

  const activePurchase = await getActivePurchaseOrThrow(payload);

  await Purchase.query()
    .patch({ endDate: swapDate })
    .findById(activePurchase.id);

  const purchase = await getOrCreatePurchase({
    planId: nextPlan.id,
    accountId: activePurchase.accountId,
    endDate: null,
  });

  await Purchase.query()
    .patch({ startDate: new Date().toISOString() })
    .findById(purchase.id);
}
