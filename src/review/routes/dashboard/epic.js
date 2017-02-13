import graphQLClient from 'modules/graphQL/client'
import actionTypes from 'review/modules/redux/actionTypes'

const dashboardEpic = action$ => (
  action$
    .ofType(actionTypes.DASHBOARD_FETCH)
    .watchTask(actionTypes.DASHBOARD_FETCH_TASK, () => (
      graphQLClient.fetch({
        query: `{
          organizations {
            id
            name
          }
        }`,
      })
    ))
)

export default dashboardEpic
