import graphQLClient from 'modules/graphql/client'
import actionTypes from 'modules/redux/actionTypes'
import { combineEpics } from 'redux-observable'

const fetchEpic = action$ =>
  action$.ofType(actionTypes.ACCOUNT_FETCH).watchTask(actionTypes.ACCOUNT_FETCH_TASK, () =>
    graphQLClient.fetch({
      query: `{
          user {
            relatedRepositories {
              id
              name
              enabled
              owner {
                login
              }
            }
          }
        }`,
    })
  )

const toggleEpic = action$ =>
  action$
    .ofType(actionTypes.ACCOUNT_TOGGLE_CLICK)
    .watchTask(actionTypes.ACCOUNT_TOGGLE_TASK, action =>
      graphQLClient.fetch({
        query: `
          mutation {
            toggleRepository(
              repositoryId: "${action.payload.repositoryId}",
              enabled: ${action.payload.enabled}
            ) {
              id
              enabled
            }
          }
        `,
      })
    )

const accountEpic = combineEpics(fetchEpic, toggleEpic)

export default accountEpic
