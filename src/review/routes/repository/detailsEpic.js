import actionTypes from 'review/modules/redux/actionTypes'
import graphQLClient from 'modules/graphQL/client'

const repositoryDetailsEpic = action$ =>
  action$
    .ofType(actionTypes.REPOSITORY_DETAILS_FETCH)
    .watchTask(actionTypes.REPOSITORY_DETAILS_FETCH_TASK, action => (
      graphQLClient.fetch({
        query: `{
          builds(
            profileName: "${action.payload.profileName}",
            repositoryName: "${action.payload.repositoryName}"
          ) {
            id
            createdAt
          }
        }`,
      })
    ))

export default repositoryDetailsEpic
