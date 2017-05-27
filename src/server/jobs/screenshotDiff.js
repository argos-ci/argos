import S3 from 'aws-sdk/clients/s3'
import config from 'config'
import computeScreenshotDiff from 'modules/build/computeScreenshotDiff'
import createModelJob from 'modules/jobs/createModelJob'
import ScreenshotDiff from 'server/models/ScreenshotDiff'

let s3

export default createModelJob('screenshotDiff', ScreenshotDiff, async screenshotDiff => {
  s3 = s3 || new S3({ signatureVersion: 'v4' })

  await computeScreenshotDiff(screenshotDiff, {
    s3,
    bucket: config.get('s3.screenshotsBucket'),
  })
})
