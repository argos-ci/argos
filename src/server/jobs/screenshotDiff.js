import S3 from 'aws-sdk/clients/s3'
import config from 'config'
import computeScreenshotDiff from 'modules/build/computeScreenshotDiff'
import createJob from 'modules/jobs/createJob'

let s3

export default createJob('screenshotDiff', async (screenshotDiffId) => {
  s3 = s3 || new S3({ signatureVersion: 'v4' })

  await computeScreenshotDiff(screenshotDiffId, {
    s3,
    bucket: config.get('s3.screenshotsBucket'),
  })
})
