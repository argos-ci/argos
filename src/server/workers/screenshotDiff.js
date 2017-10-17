import 'server/bootstrap/setup'
// --- Post bootstrap -----
import createJobWorker from 'modules/jobs/createJobWorker'
import screenshotDiffJob from 'server/jobs/screenshotDiff'

createJobWorker(screenshotDiffJob)
