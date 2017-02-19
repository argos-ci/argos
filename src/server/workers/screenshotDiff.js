import 'server/bootstrap/setup'
import createJobWorker from 'modules/jobs/createJobWorker'
import screenshotDiffJob from 'server/jobs/screenshotDiff'

createJobWorker(screenshotDiffJob)
