import {
  Account,
  Organization,
  Plan,
  Purchase,
  Synchronization,
  User,
} from '@argos-ci/database/models'
import { job } from './job'

export async function synchronizeFromInstallationId(installationId) {
  const synchronization = await Synchronization.query().insert({
    type: 'installation',
    installationId,
    jobStatus: 'pending',
  })

  await job.push(synchronization.id)
}

export async function synchronizeFromUserId(userId) {
  const synchronization = await Synchronization.query().insert({
    type: 'user',
    userId,
    jobStatus: 'pending',
  })

  await job.push(synchronization.id)
}

async function getAccountUser(githubId) {
  return Account.query()
    .select('user.*', 'user.id as userId', 'accounts.id')
    .joinRelated('user')
    .findOne('user.githubId', githubId)
}

async function getAccountOrganization(githubId) {
  return Account.query()
    .select(
      'organization.*',
      'organization.id as organizationId',
      'accounts.id',
    )
    .joinRelated('organization')
    .findOne('organization.githubId', githubId)
}

async function getOrCreateUser(payload) {
  const { email } = payload.sender
  const { id: githubId, login } = payload.marketplace_purchase.account
  const user = await User.query().findOne({ githubId })
  if (user) return user
  return User.query().insertAndFetch({ githubId, login, email })
}

async function getOrCreateOrganization(payload) {
  const { id: githubId, login } = payload.marketplace_purchase.account
  const organization = await Organization.query().findOne({ githubId })
  if (organization) return organization
  return Organization.query().insertAndFetch({ githubId, login })
}

export async function getAccount(payload) {
  const { type, id: githubId } = payload.marketplace_purchase.account
  return type.toLowerCase() === 'user'
    ? getAccountUser(githubId)
    : getAccountOrganization(githubId)
}

export async function getOrCreateAccount(payload) {
  const account = await getAccount(payload)
  if (account) return account

  if (payload.marketplace_purchase.account.type === 'User') {
    const user = await getOrCreateUser(payload)
    return Account.query().insertAndFetch({ userId: user.id })
  }

  const organization = await getOrCreateOrganization(payload)
  return Account.query().insertAndFetch({ organizationId: organization.id })
}

export async function getOrCreatePurchase({ account, plan }) {
  const purchase = await Purchase.query().findOne({
    accountId: account.id,
    planId: plan.id,
  })
  if (purchase) return purchase
  return Purchase.query().insertAndFetch({
    accountId: account.id,
    planId: plan.id,
  })
}

export async function throwMissingAccountError(payload) {
  const { type, githubId } = payload.marketplace_purchase
  throw new Error(
    `missing ${
      type ? type.toLowerCase() : ''
    } account with githubId: '${githubId}'.`,
  )
}

export async function throwMissingPlanError({ githubId }) {
  throw new Error(`missing plan with githubId: '${githubId}'`)
}

async function getEventPlanOrThrow(marketplacePurchase) {
  const {
    plan: { id: githubId },
  } = marketplacePurchase
  const plan = await Plan.query().findOne({ githubId })
  if (!plan) throwMissingPlanError({ githubId })
  return plan
}

export async function getPlanOrThrow(payload) {
  return getEventPlanOrThrow(payload.marketplace_purchase)
}

export async function getPreviousPlanOrThrow(payload) {
  return getEventPlanOrThrow(payload.previous_marketplace_purchase)
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
