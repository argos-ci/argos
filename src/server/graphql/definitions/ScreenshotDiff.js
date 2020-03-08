import gql from 'graphql-tag'
import { getS3Client } from 'server/services/s3'
import config from 'config'

export const typeDefs = gql`
  type ScreenshotDiff {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    buildId: ID!
    baseScreenshotId: ID
    baseScreenshot: Screenshot
    compareScreenshotId: ID!
    compareScreenshot: Screenshot!
    score: Float
    url: String
    "Represent the state of the job generating the diffs"
    jobStatus: JobStatus
    "Represent the status given by the user"
    validationStatus: ValidationStatus!
  }
`

export const resolvers = {
  ScreenshotDiff: {
    async baseScreenshot(screenshotDiff) {
      return screenshotDiff.$relatedQuery('baseScreenshot')
    },
    async compareScreenshot(screenshotDiff) {
      return screenshotDiff.$relatedQuery('compareScreenshot')
    },
    url(screenshotDiff) {
      if (!screenshotDiff.s3Id) return null
      const s3 = getS3Client()
      return s3.getSignedUrl('getObject', {
        Bucket: config.get('s3.screenshotsBucket'),
        Key: screenshotDiff.s3Id,
        Expires: 7200,
      })
    },
  },
}
