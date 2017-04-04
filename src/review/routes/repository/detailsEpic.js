import graphQLClient from 'modules/graphQL/client'
import actionTypes from 'review/modules/redux/actionTypes'

const repositoryDetailsEpic = action$ => (
  action$
    .ofType(actionTypes.REPOSITORY_DETAILS_FETCH)
    .watchTask(actionTypes.REPOSITORY_DETAILS_FETCH_TASK, action => (
      graphQLClient.fetch({
        query: `{
          repository(
            ownerLogin: "${action.payload.profileName}",
            repositoryName: "${action.payload.repositoryName}"
          ) {
            name
            builds(
              first: 5
              after: ${action.payload.after}
            ) {
              pageInfo {
                totalCount
                endCursor
                hasNextPage
              }
              edges {
                id
                number
                status
                createdAt
              }
            }
          }
        }`,
      })
    ))
)

export default repositoryDetailsEpic
