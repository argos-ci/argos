import Synchronization from 'server/models/Synchronization'
import synchronizeJob from 'server/jobs/synchronize'

async function syncFromUserId(userId) {
  const synchronization = await Synchronization.query().insert({
    userId,
    jobStatus: 'pending',
    type: 'github',
  })

  synchronizeJob.push(synchronization.id)
}

export default syncFromUserId
