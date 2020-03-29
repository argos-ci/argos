import { Synchronization } from '@argos-ci/database/models'
import { job as synchronizeJob } from './job'

export async function syncFromUserId(userId) {
  const synchronization = await Synchronization.query().insert({
    userId,
    jobStatus: 'pending',
    type: 'github',
  })

  synchronizeJob.push(synchronization.id)
}
