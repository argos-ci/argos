import { Synchronization } from '@argos-ci/database/models'
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
