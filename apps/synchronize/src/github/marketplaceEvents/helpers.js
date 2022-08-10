import { Plan, Purchase } from '@argos-ci/database/models'

export async function getOrCreatePurchase({ accountId, planId, endDate }) {
  const purchase = await Purchase.query().findOne({
    accountId,
    planId,
    ...(endDate !== undefined ? endDate : {}),
  })
  if (purchase) return purchase
  return Purchase.query().insertAndFetch({ accountId, planId })
}

export async function getPlanOrThrow(payload) {
  const { id: githubId } = payload.marketplace_purchase.plan
  const plan = await Plan.query().findOne({ githubId })
  if (!plan) throw new Error(`missing plan with githubId: '${githubId}'`)
  return plan
}

export async function getActivePurchaseOrThrow(payload) {
  const { id: planGithubId } = payload.previous_marketplace_purchase.plan
  const { id: accountGithubId } = payload.marketplace_purchase.account
  const today = new Date().toISOString()

  const purchaseQuery = Purchase.query()
    .where('startDate', '<=', today)
    .joinRelated('plan')
    .where('plan.githubId', planGithubId)
    .where((query) =>
      query.whereNull('endDate').orWhere('endDate', '>=', today),
    )
  if (payload.marketplace_purchase.account.type === 'User') {
    purchaseQuery.joinRelated('user').where('user.githubId', accountGithubId)
  } else {
    purchaseQuery
      .joinRelated('organization')
      .where('organization.githubId', accountGithubId)
  }
  const purchases = await purchaseQuery
  if (purchases.length === 0) {
    throw new Error(
      `missing purchase with plan’s githubId: '${planGithubId}' and account’s githubId: '${accountGithubId}'`,
    )
  }
  if (purchases.length > 1) {
    throw new Error(
      `multiple actives purchases for plan with githubId: '${planGithubId}' and account with githubId: '${accountGithubId}'`,
    )
  }
  return purchases[0]
}
