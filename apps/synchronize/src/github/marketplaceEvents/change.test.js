import { useDatabase, factory } from '@argos-ci/database/testing'
import { Purchase } from '@argos-ci/database/models'
import { CHANGE_EVENT_PAYLOAD } from '../../fixtures/change-event-payload'
import { change } from './change'

const trimTime = (datetime) => datetime.toISOString().split('T')[0]
const today = trimTime(new Date())
const getFutureDate = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

describe('marketplace "change" event', () => {
  useDatabase()

  let account
  let previousPlan
  let nextPlan
  const changePayload = { ...CHANGE_EVENT_PAYLOAD, action: 'changed' }
  const {
    account: payloadAccount,
    plan: payloadPreviousPlan,
  } = changePayload.previous_marketplace_purchase
  const { plan: payloadNextPlan } = changePayload.marketplace_purchase

  beforeEach(async () => {
    const organization = await factory.create('Organization', {
      githubId: payloadAccount.id,
    })
    account = await factory.create('Account', {
      organizationId: organization.id,
    })
    previousPlan = await factory.create('Plan', {
      githubId: payloadPreviousPlan.id,
    })
    nextPlan = await factory.create('Plan', { githubId: payloadNextPlan.id })
  })

  describe('with a next purchase plan', () => {
    let purchases

    beforeEach(async () => {
      // Active purchase
      await factory.create('Purchase', {
        accountId: account.id,
        planId: previousPlan.id,
      })

      // Pending purchase
      await factory.create('Purchase', {
        accountId: account.id,
        planId: nextPlan.id,
        startDate: getFutureDate(12).toISOString(),
      })

      await change(changePayload)
      purchases = await Purchase.query().orderBy('startDate')
    })

    it('should set end date to active purchase', () => {
      expect(trimTime(purchases[0].endDate)).toBe(today)
    })

    it('should update start date to pending purchase', () => {
      expect(trimTime(purchases[1].startDate)).toBe(today)
    })
  })

  describe('without pending purchase', () => {
    let purchases

    beforeEach(async () => {
      await factory.create('Purchase', {
        accountId: account.id,
        planId: previousPlan.id,
      })
      await change(changePayload)
      purchases = await Purchase.query().orderBy('startDate')
    })

    it('should set end date to active purchase', () => {
      expect(trimTime(purchases[0].endDate)).toBe(today)
    })

    it('should create a new purchase', () => {
      expect(purchases).toHaveLength(2)
      expect(trimTime(purchases[1].startDate)).toBe(today)
    })
  })
})
