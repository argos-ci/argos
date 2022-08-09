import { useDatabase, factory } from '@argos-ci/database/testing'
import { Purchase, Plan, Organization, User } from '@argos-ci/database/models'
import { handleGitHubEvents } from './events'
import { PURCHASE_EVENT_PAYLOAD } from '../fixtures/purchase-event-payload'
import { getAccount } from '../helpers'
import { Account } from '../../../database/src/models/Account'

describe('marketplace "purchase" event', () => {
  useDatabase()

  const purchasePayload = PURCHASE_EVENT_PAYLOAD
  const {
    account: payloadAccount,
    plan: payloadPlan,
  } = purchasePayload.marketplace_purchase

  describe('from a new user', () => {
    beforeEach(async () => {
      await factory.create('Plan', { githubId: payloadPlan.id })
      await handleGitHubEvents({
        name: 'marketplace_purchase',
        payload: purchasePayload,
      })
    })

    it('should create a user', async () => {
      const users = await User.query()
      expect(users).toHaveLength(1)
      expect(users[0]).toMatchObject({
        githubId: payloadAccount.id,
        login: payloadAccount.login,
      })
    })

    it('should create an account', async () => {
      const account = await getAccount(purchasePayload)
      expect(account).toMatchObject({
        githubId: payloadAccount.id,
        login: payloadAccount.login,
        email: purchasePayload.sender.email,
      })
    })

    it('should add a purchase to the account', async () => {
      const account = await getAccount(purchasePayload)
      const plan = await Plan.query().findOne({ githubId: payloadPlan.id })
      const purchase = await Purchase.query().findOne({
        accountId: account.id,
        planId: plan.id,
      })
      expect(purchase).toBeDefined()
    })
  })

  describe('from a registered user', () => {
    describe('without account', () => {
      let user
      let previousPurchasesCount
      let previousUserCount
      let previousAccountCount
      let registeredUserPayload

      beforeEach(async () => {
        user = await factory.create('User')
        await factory.create('Plan', { githubId: payloadPlan.id })
        previousAccountCount = await Account.query().resultSize()
        previousPurchasesCount = await Purchase.query().resultSize()
        previousUserCount = await User.query().resultSize()
        registeredUserPayload = {
          ...purchasePayload,
          marketplace_purchase: {
            ...purchasePayload.marketplace_purchase,
            account: {
              ...purchasePayload.marketplace_purchase.account,
              id: user.githubId,
            },
          },
        }
        await handleGitHubEvents({
          name: 'marketplace_purchase',
          payload: registeredUserPayload,
        })
      })

      it('should not create user', async () => {
        const usersCount = await User.query().resultSize()
        expect(usersCount).toBe(previousUserCount)
      })

      it('should create an account', async () => {
        const accounts = await Account.query()
        expect(accounts).toHaveLength(previousAccountCount + 1)
        expect(accounts[0]).toMatchObject({
          userId: user.id,
          organizationId: null,
        })
      })

      it('should add a purchase to the account', async () => {
        const account = await getAccount(registeredUserPayload)
        const purchases = await Purchase.query()
        expect(purchases).toHaveLength(previousPurchasesCount + 1)
        expect(purchases[0].accountId).toBe(account.id)
      })
    })

    describe('with account', () => {
      let user
      let account
      let previousAccountCount
      let previousPurchasesCount
      let previousUserCount

      beforeEach(async () => {
        user = await factory.create('User')
        account = await factory.create('Account', {
          userId: user.id,
          organizationId: null,
        })
        await factory.create('Plan', { githubId: payloadPlan.id })
        previousAccountCount = await Account.query().resultSize()
        previousPurchasesCount = await Purchase.query()
          .where({ accountId: account.id })
          .resultSize()
        previousUserCount = await User.query().resultSize()
        await handleGitHubEvents({
          name: 'marketplace_purchase',
          payload: {
            ...purchasePayload,
            marketplace_purchase: {
              ...purchasePayload.marketplace_purchase,
              account: {
                ...purchasePayload.marketplace_purchase.account,
                id: user.githubId,
              },
            },
          },
        })
      })

      it('should not create user', async () => {
        const usersCount = await User.query().resultSize()
        expect(usersCount).toBe(previousUserCount)
      })

      it('should not create account', async () => {
        const accountCount = await Account.query().resultSize()
        expect(accountCount).toBe(previousAccountCount)
      })

      it('should add a purchase to the account', async () => {
        const purchases = await Purchase.query()
          .where({ accountId: account.id })
          .resultSize()
        expect(purchases).toBe(previousPurchasesCount + 1)
      })
    })
  })

  describe('from a new organization', () => {
    const githubId = 777888999
    const login = 'smooth-code'
    let newOrganizationPayload

    beforeEach(async () => {
      await factory.create('Plan', { githubId: payloadPlan.id })
      newOrganizationPayload = {
        ...purchasePayload,
        marketplace_purchase: {
          ...purchasePayload.marketplace_purchase,
          account: {
            ...purchasePayload.marketplace_purchase.account,
            type: 'Organization',
            id: githubId,
            login,
          },
        },
      }
      await handleGitHubEvents({
        name: 'marketplace_purchase',
        payload: newOrganizationPayload,
      })
    })

    it('should create an organization', async () => {
      const organizations = await Organization.query()
      expect(organizations).toHaveLength(1)
      expect(organizations[0]).toMatchObject({ githubId, login })
    })
    it('should create an account', async () => {
      const account = await getAccount(newOrganizationPayload)
      expect(account).toMatchObject({ githubId, login })
    })
    it('should create add purchase to account', async () => {
      const account = await getAccount(newOrganizationPayload)
      const plan = await Plan.query().findOne({ githubId: payloadPlan.id })
      const purchase = await Purchase.query().findOne({
        accountId: account.id,
        planId: plan.id,
      })
      expect(purchase).toBeDefined()
    })
  })

  describe('from registered organization', () => {
    describe('without account', () => {
      let organization
      let previousPurchasesCount
      let previousOrganizationCount
      let previousAccountCount
      let newOrganizationPayload

      beforeEach(async () => {
        organization = await factory.create('Organization')
        await factory.create('Plan', { githubId: payloadPlan.id })
        previousAccountCount = await Account.query().resultSize()
        previousPurchasesCount = await Purchase.query().resultSize()
        previousOrganizationCount = await Organization.query().resultSize()
        newOrganizationPayload = {
          ...purchasePayload,
          marketplace_purchase: {
            ...purchasePayload.marketplace_purchase,
            account: {
              ...purchasePayload.marketplace_purchase.account,
              type: 'organization',
              id: organization.githubId,
            },
          },
        }
        await handleGitHubEvents({
          name: 'marketplace_purchase',
          payload: newOrganizationPayload,
        })
      })

      it('should not create organization', async () => {
        const organizationsCount = await Organization.query().resultSize()
        expect(organizationsCount).toBe(previousOrganizationCount)
      })

      it('should create an account', async () => {
        const accounts = await Account.query()
        expect(accounts).toHaveLength(previousAccountCount + 1)
        expect(accounts[0]).toMatchObject({
          organizationId: organization.id,
          userId: null,
        })
      })

      it('should add a purchase to the account', async () => {
        const account = await getAccount(newOrganizationPayload)
        const purchases = await Purchase.query()
        expect(purchases).toHaveLength(previousPurchasesCount + 1)
        expect(purchases[0].accountId).toBe(account.id)
      })
    })

    describe('with account', () => {
      let organization
      let account
      let previousAccountCount
      let previousPurchasesCount
      let previousOrganizationCount

      beforeEach(async () => {
        organization = await factory.create('Organization')
        account = await factory.create('Account', {
          organizationId: organization.id,
          userId: null,
        })
        await factory.create('Plan', { githubId: payloadPlan.id })
        previousAccountCount = await Account.query().resultSize()
        previousPurchasesCount = await Purchase.query()
          .where({ accountId: account.id })
          .resultSize()
        previousOrganizationCount = await Organization.query().resultSize()
        await handleGitHubEvents({
          name: 'marketplace_purchase',
          payload: {
            ...purchasePayload,
            marketplace_purchase: {
              ...purchasePayload.marketplace_purchase,
              account: {
                ...purchasePayload.marketplace_purchase.account,
                type: 'organization',
                id: organization.githubId,
              },
            },
          },
        })
      })

      it('should not create organization', async () => {
        const organizationsCount = await Organization.query().resultSize()
        expect(organizationsCount).toBe(previousOrganizationCount)
      })

      it('should not create account', async () => {
        const accountCount = await Account.query().resultSize()
        expect(accountCount).toBe(previousAccountCount)
      })

      it('should add a purchase to the account', async () => {
        const purchases = await Purchase.query()
          .where({ accountId: account.id })
          .resultSize()
        expect(purchases).toBe(previousPurchasesCount + 1)
      })
    })
  })

  describe('of a missing plan', () => {
    it.skip('should not create purchase', async () => {
      await expect(
        handleGitHubEvents({
          name: 'marketplace_purchase',
          payload: PURCHASE_EVENT_PAYLOAD,
        }),
      ).rejects.toThrow('missing plan')
      const purchaseCount = await Purchase.query().resultSize()
      expect(purchaseCount).toBe(0)
    })
  })
})
