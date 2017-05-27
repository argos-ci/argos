import graphQLClient from 'modules/graphql/client'
import actionTypes from 'modules/redux/actionTypes'

const dashboardEpic = action$ =>
  action$.ofType(actionTypes.DASHBOARD_FETCH).watchTask(actionTypes.DASHBOARD_FETCH_TASK, () =>
    graphQLClient.fetch({
      query: `{
          owners {
            login
            name
            type
          }
        }`,
    })
  )

export default dashboardEpic
