import synchronize from 'modules/synchronizer/synchronize'
import createJob from 'modules/jobs/createJob'

export default createJob('synchronize', async (synchronizationId) => {
  await synchronize(synchronizationId)
})
