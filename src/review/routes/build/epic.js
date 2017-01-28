import actionTypes from 'review/redux/actionTypes'
import graphQLClient from 'modules/graphQL/client'

const buildEpic = action$ =>
  action$
    .ofType(actionTypes.BUILD_FETCH)
    .watchTask(actionTypes.BUILD_FETCH_TASK, action => (
      graphQLClient.fetch({
        query: `{
          build(id: ${action.payload.buildId}) {
            createdAt
            baseScreenshotBucket {
              id
              name
              commit
            }
            compareScreenshotBucket {
              id
              name
              commit
            }
          }
          screenshotDiffs(buildId: ${action.payload.buildId}) {
            id
            jobStatus
            validationStatus
            score
            baseScreenshot {
              name
              s3Id
            }
            compareScreenshot {
              name
              s3Id
            }
          }
        }`,
      })
    ))

export default buildEpic
