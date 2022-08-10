import { Purchase } from '@argos-ci/database/models'
import { getActivePurchaseOrThrow } from './helpers'

export async function pendingChangeCancelled(payload) {
  const activePurchase = await getActivePurchaseOrThrow(payload)
  await Purchase.query().patch({ endDate: null }).findById(activePurchase.id)
}
