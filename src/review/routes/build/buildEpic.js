import { combineEpics } from 'redux-observable'
import graphQLClient from 'modules/graphql/client'
import actionTypes from 'modules/redux/actionTypes'
import { SUCCESS } from 'modules/rxjs/operator/watchTask'

const fetchEpic = action$ =>
  action$
    .ofType(actionTypes.BUILD_FETCH)
    .combineLatest(
      action$
        .ofType(actionTypes.BUILD_VALIDATION_TASK)
        .filter(action => action.payload.state === SUCCESS)
        .startWith({})
    )
    .watchTask(actionTypes.BUILD_FETCH_TASK, ([action]) =>
      graphQLClient.fetch({
        query: `{
          build(id: ${action.payload.buildId}) {
            id
            createdAt
            baseScreenshotBucket {
              commit
            }
            compareScreenshotBucket {
              branch
              commit
            }
            repository {
              authorization
              name
              owner {
                login
              }
            }
            status
            screenshotDiffs {
              id
              jobStatus
              score
              s3Id
              baseScreenshot {
                name
                s3Id
              }
              compareScreenshot {
                name
                s3Id
              }
            }
          }
        }`,
      })
    )

const validationEpic = action$ =>
  action$
    .ofType(actionTypes.BUILD_VALIDATION_CLICK)
    .watchTask(actionTypes.BUILD_VALIDATION_TASK, action =>
      graphQLClient.fetch({
        query: `
          mutation {
            setValidationStatus(
              buildId: "${action.payload.buildId}",
              validationStatus: ${action.payload.validationStatus}
            )
          }
        `,
      })
    )

const buildEpic = combineEpics(fetchEpic, validationEpic)

export default buildEpic
