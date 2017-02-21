import createBuildDiffs from 'modules/build/createBuildDiffs'
import createJob from 'modules/jobs/createJob'
import screenshotDiffJob from 'server/jobs/screenshotDiff'

export default createJob('build', async (buildId) => {
  const screenshotDiffs = await createBuildDiffs(buildId)
  await Promise.all(screenshotDiffs.map(({ id }) => screenshotDiffJob.push(id)))
})
