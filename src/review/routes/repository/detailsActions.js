import actionTypes from 'modules/redux/actionTypes'

const detailsActions = {
  fetch: (props, after) => ({
    type: actionTypes.REPOSITORY_DETAILS_FETCH,
    payload: {
      profileName: props.params.profileName,
      repositoryName: props.params.repositoryName,
      after,
    },
  }),
}

export default detailsActions
