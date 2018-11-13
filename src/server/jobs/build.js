import display from 'modules/scripts/display'
import { pushBuildNotification } from 'modules/build/notifications'
import createBuildDiffs from 'modules/build/createBuildDiffs'
import createModelJob from 'modules/jobs/createModelJob'
import screenshotDiffJob from 'server/jobs/screenshotDiff'
import Build from 'server/models/Build'

export async function performBuild(build) {
  display.info('BuildJob.performBuild started')
  await pushBuildNotification({ buildId: build.id, type: 'progress' })
  display.info('BuildJob.performBuild finished')

  const screenshotDiffs = await createBuildDiffs(build)
  display.info('INFO', 'BuildJob.createBuildDiffs finished')
  const screenshotDiffJobs = await Promise.all(
    screenshotDiffs
      .filter(({ jobStatus }) => jobStatus !== 'complete')
      .map(({ id }) => screenshotDiffJob.push(id))
  )
  display.info('INFO', 'BuildJob.screenshotDiffJob finished')

  if (screenshotDiffJobs.length === 0) {
    await pushBuildNotification({ buildId: build.id, type: 'no-diff-detected' })
  }
}

export default createModelJob('build', Build, performBuild)
