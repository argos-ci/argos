import '../setup'
import { createJobWorker } from '@argos-ci/job-core'
import { job as buildJob } from '@argos-ci/build'
import { job as synchronizeJob } from '@argos-ci/synchronize'
import { job as buildNotificationJob } from '@argos-ci/build-notification'

createJobWorker(buildJob, synchronizeJob, buildNotificationJob)
