import { useDatabase, factory } from '@argos-ci/database/testing'
import { Purchase } from '@argos-ci/database/models'
import { CHANGE_EVENT_PAYLOAD } from '../../fixtures/change-event-payload'
import { change } from './change'

describe('marketplace "pending_change" event', () => {
  useDatabase()

  let account
  let previousPlan
  let nextPlan
  const pendingChangePayload = {
    ...CHANGE_EVENT_PAYLOAD,
    action: 'pending_change',
  }

  beforeEach(async () => {
    const organization = await factory.create('Organization', {
      githubId: pendingChangePayload.previous_marketplace_purchase.account.id,
    })
    account = await factory.create('Account', {
      organizationId: organization.id,
      userId: null,
    })
    previousPlan = await factory.create('Plan', {
      githubId: pendingChangePayload.previous_marketplace_purchase.plan.id,
    })
    nextPlan = await factory.create('Plan', {
      githubId: pendingChangePayload.marketplace_purchase.plan.id,
    })
  })

  describe('updates a purchase', () => {
    let purchases

    beforeEach(async () => {
      await factory.create('Purchase', {
        accountId: account.id,
        planId: previousPlan.id,
      })
      await change(pendingChangePayload)
      purchases = await Purchase.query()
        .where({ accountId: account.id })
        .orderBy('planId')
    })

    it('should create a purchase', async () => {
      expect(purchases).toHaveLength(2)
      expect(purchases[1].planId).toBe(nextPlan.id)
      expect(purchases[1].endDate).toBeNull()
      expect(purchases[1].startDate).not.toBeNull()
      expect(purchases[1].startDate).not.toBeUndefined()
    })

    it('should update old purchase end date', async () => {
      expect(purchases[0].planId).toBe(previousPlan.id)
      expect(purchases[0].endDate).not.toBeNull()
      expect(purchases[0].endDate).not.toBeUndefined()
    })
  })

  describe('updates to a missing plan', () => {
    it.skip('should throw an error', async () => {
      const payload = {
        ...pendingChangePayload,
        marketplace_purchase: {
          ...pendingChangePayload.marketplace_purchase,
          plan: {
            ...pendingChangePayload.marketplace_purchase.plan,
            id: '404',
          },
        },
      }

      expect.assertions(1)

      try {
        await change(payload)
      } catch (error) {
        expect(error.message).toMatch('missing plan')
      }
    })
  })

  describe('updates on a missing purchase', () => {
    it('should throw an error', async () => {
      expect.assertions(1)

      try {
        await change(pendingChangePayload)
      } catch (error) {
        expect(error.message).toMatch('missing purchase')
      }
    })
  })
})
