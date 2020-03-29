import config from '@argos-ci/config'
import { createModelJob } from '@argos-ci/job-core'
import { ScreenshotDiff } from '@argos-ci/database/models'
import { s3 } from '@argos-ci/storage'
import { computeScreenshotDiff } from './computeScreenshotDiff'

export const job = createModelJob(
  'screenshotDiff',
  ScreenshotDiff,
  async screenshotDiff => {
    await computeScreenshotDiff(screenshotDiff, {
      s3: s3(),
      bucket: config.get('s3.screenshotsBucket'),
    })
  },
)
