import 'server/bootstrap/setup'
import createJobWorker from 'modules/jobs/createJobWorker'
import buildJob from 'server/jobs/build'
import synchronizeJob from 'server/jobs/synchronize'
import buildNotificationJob from 'server/jobs/buildNotification'

createJobWorker(buildJob, synchronizeJob, buildNotificationJob)
