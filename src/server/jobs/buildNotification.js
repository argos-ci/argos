import createModelJob from 'modules/jobs/createModelJob'
import BuildNotification from 'server/models/BuildNotification'
import { processBuildNotification } from 'modules/build/notifications'

export default createModelJob('buildNotification', BuildNotification, async buildNotification => {
  await processBuildNotification(buildNotification)
})
