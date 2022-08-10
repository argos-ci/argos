/* eslint-disable default-case */
import { Purchase } from "@argos-ci/database/models";
import { getActivePurchaseOrThrow } from "./helpers";

export async function cancel(payload) {
  const activePurchase = await getActivePurchaseOrThrow(payload);
  await Purchase.query()
    .patch({
      endDate: new Date(
        payload.marketplace_purchase.next_billing_date
      ).toISOString(),
    })
    .findById(activePurchase.id);
}
