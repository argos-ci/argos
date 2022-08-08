/* eslint-disable default-case */
import logger from '@argos-ci/logger'
import {
  getMatchingPlan,
  getOrCreateAccount,
  getOrCreatePurchase,
  synchronizeFromInstallationId,
} from '../helpers'
import { getOrCreateInstallation } from './synchronizer'

export async function handleGitHubEvents({ name, payload }) {
  logger.info('GitHub event', name)
  try {
    switch (name) {
      case 'marketplace_purchase': {
        switch (payload.action) {
          case 'purchased': {
            const plan = await getMatchingPlan(payload)
            const account = await getOrCreateAccount(payload)
            await getOrCreatePurchase({
              accountId: account.id,
              planId: plan.id,
            })
            return
          }
        }
        return
      }
      case 'installation_repositories': {
        switch (payload.action) {
          case 'removed':
          case 'added': {
            const installation = await getOrCreateInstallation({
              githubId: payload.installation.id,
              deleted: false,
            })
            await synchronizeFromInstallationId(installation.id)
            return
          }
        }
        return
      }
      case 'installation': {
        switch (payload.action) {
          case 'created': {
            const installation = await getOrCreateInstallation({
              githubId: payload.installation.id,
              deleted: false,
            })
            await synchronizeFromInstallationId(installation.id)
            return
          }
          case 'deleted': {
            const installation = await getOrCreateInstallation({
              githubId: payload.installation.id,
              deleted: true,
            })
            await synchronizeFromInstallationId(installation.id)
            return
          }
        }
        return
      }
    }
  } catch (error) {
    logger.error(error)
  }
}
