/* eslint-disable default-case */
import logger from '@argos-ci/logger'
import { synchronizeFromInstallationId } from '../helpers'
import { getOrCreateInstallation } from './synchronizer'

export async function handleGitHubEvents({ name, payload }) {
  logger.info('GitHub event', name)
  try {
    switch (name) {
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
    console.error(error)
  }
}
