import gql from 'graphql-tag'

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
    s3Id: ID
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
  },
}
