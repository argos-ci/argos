import graphQLClient from 'modules/graphQL/client'
import actionTypes from 'review/modules/redux/actionTypes'

const profileEpic = action$ => (
  action$
    .ofType(actionTypes.PROFILE_FETCH)
    .watchTask(actionTypes.PROFILE_FETCH_TASK, action => (
      graphQLClient.fetch({
        query: `{
          repositories(
            profileName: "${action.payload.profileName}",
          ) {
            id
            name
          }
        }`,
      })
    ))
)

export default profileEpic
