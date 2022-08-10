import { useDatabase, factory } from '@argos-ci/database/testing'
import { Purchase } from '@argos-ci/database/models'
import { CHANGE_EVENT_PAYLOAD } from '../../fixtures/change-event-payload'
import { pendingChangeCancelled } from './pendingChangeCancelled'

describe('marketplace "pending_change_cancelled" event', () => {
  useDatabase()

  const pendingChangeCancelPayload = {
    ...CHANGE_EVENT_PAYLOAD,
    action: 'pending_change_cancelled',
  }

  describe('on registered purchase', () => {
    let account
    let plan

    beforeEach(async () => {
      const organization = await factory.create('Organization', {
        githubId:
          pendingChangeCancelPayload.previous_marketplace_purchase.account.id,
      })
      account = await factory.create('Account', {
        organizationId: organization.id,
        userId: null,
      })
      plan = await factory.create('Plan', {
        githubId:
          pendingChangeCancelPayload.previous_marketplace_purchase.plan.id,
      })
      await factory.create('Purchase', {
        accountId: account.id,
        planId: plan.id,
      })
      await pendingChangeCancelled(pendingChangeCancelPayload)
    })

    it('should remove end date', async () => {
      const purchase = await Purchase.query().findOne({
        accountId: account.id,
        planId: plan.id,
      })
      expect(purchase.endDate).toBeNull()
    })
  })

  describe('on missing purchase', () => {
    it('should throw an error', async () => {
      expect.assertions(1)
      try {
        await pendingChangeCancelled(pendingChangeCancelPayload)
      } catch (error) {
        expect(error.message).toMatch('missing purchase')
      }
    })
  })
})
