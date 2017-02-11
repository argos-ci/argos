import actionTypes from 'review/modules/redux/actionTypes'
import graphQLClient from 'modules/graphQL/client'

const profileEpic = action$ =>
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

export default profileEpic
