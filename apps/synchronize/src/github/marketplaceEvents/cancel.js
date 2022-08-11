/* eslint-disable default-case */
import { Purchase } from "@argos-ci/database/models";
import { getActivePurchaseOrThrow } from "./helpers";

export async function cancel(payload) {
  /**
   * End date calculation :
   * - Free plan : current date and time
   * - Paid plan : next billing date (should be tested)
   */

  const endDate = new Date().toISOString();
  const activePurchase = await getActivePurchaseOrThrow(payload);
  await Purchase.query().patch({ endDate }).findById(activePurchase.id);
}
