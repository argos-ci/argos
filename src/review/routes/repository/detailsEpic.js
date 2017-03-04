import graphQLClient from 'modules/graphQL/client'
import actionTypes from 'review/modules/redux/actionTypes'

const repositoryDetailsEpic = action$ => (
  action$
    .ofType(actionTypes.REPOSITORY_DETAILS_FETCH)
    .watchTask(actionTypes.REPOSITORY_DETAILS_FETCH_TASK, (action) => {
      const {
        payload,
      } = action

      return graphQLClient.fetch({
        query: `{
          builds(
            profileName: "${payload.profileName}",
            repositoryName: "${payload.repositoryName}"
            first: ${payload.first}
            after: ${payload.after}
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
        }`,
      })
    })
)

export default repositoryDetailsEpic
