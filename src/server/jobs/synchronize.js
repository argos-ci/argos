import synchronize from 'modules/synchronizer/synchronize'
import Synchronization from 'server/models/Synchronization'
import createModelJob from 'modules/jobs/createModelJob'

export default createModelJob('synchronize', Synchronization, synchronize)
