import graphQLClient from 'modules/graphql/client'
import actionTypes from 'modules/redux/actionTypes'

const repositoryEpic = action$ =>
  action$
    .ofType(actionTypes.REPOSITORY_FETCH)
    .watchTask(actionTypes.REPOSITORY_FETCH_TASK, action =>
      graphQLClient.fetch({
        query: `{
          repository(
            ownerLogin: "${action.payload.profileName}",
            repositoryName: "${action.payload.repositoryName}"
          ) {
            token
            authorization
          }
        }`,
      })
    )

export default repositoryEpic
