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

export async function getAccountUser(githubId) {
  return Account.query()
    .select('user.*', 'user.id as userId', 'accounts.id')
    .joinRelated('user')
    .findOne('user.githubId', githubId)
}

export async function getAccountOrganization(githubId) {
  return Account.query()
    .select(
      'organization.*',
      'organization.id as organizationId',
      'accounts.id',
    )
    .joinRelated('organization')
    .findOne('organization.githubId', githubId)
}

export async function getOrCreateUser(payload) {
  const { email } = payload.sender
  const { id: githubId, login } = payload.marketplace_purchase.account
  const user = await User.query().findOne({ githubId })
  if (user) return user
  return User.query().insertAndFetch({ githubId, login, email })
}

export async function getOrCreateOrganization(payload) {
  const { id: githubId, login } = payload.marketplace_purchase.account
  const organization = await Organization.query().findOne({ githubId })
  if (organization) return organization
  return Organization.query().insertAndFetch({ githubId, login })
}

export async function getAccount({ type, githubId }) {
  return type.toLowerCase() === 'user'
    ? getAccountUser(githubId)
    : getAccountOrganization(githubId)
}

export async function getOrCreateAccount(payload) {
  const { type, id: githubId } = payload.marketplace_purchase.account
  const account = await getAccount({ type, githubId })
  if (account) return account

  if (type === 'User') {
    const user = await getOrCreateUser(payload)
    return Account.query().insertAndFetch({ userId: user.id })
  }

  const organization = await getOrCreateOrganization(payload)
  return Account.query().insertAndFetch({ organizationId: organization.id })
}

export async function getOrCreatePurchase({ accountId, planId }) {
  const purchase = await Purchase.query().findOne({ accountId, planId })
  if (purchase) return purchase
  return Purchase.query().insertAndFetch({ accountId, planId })
}

export async function getMatchingPlan(payload) {
  const { id: planGithubId } = payload.marketplace_purchase.plan
  const plan = await Plan.query().findOne({ githubId: planGithubId })
  if (!plan) {
    throw new Error(`Can’t find a plan with the githubId: "${planGithubId}".`)
  }
  return plan
}
