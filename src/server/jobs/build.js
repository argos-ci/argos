import createBuildDiffs from 'modules/build/createBuildDiffs'
import createModelJob from 'modules/jobs/createModelJob'
import screenshotDiffJob from 'server/jobs/screenshotDiff'
import Build from 'server/models/Build'

export default createModelJob('build', Build, async (build) => {
  const screenshotDiffs = await createBuildDiffs(build)
  await Promise.all(screenshotDiffs.map(({ id }) => screenshotDiffJob.push(id)))
})
