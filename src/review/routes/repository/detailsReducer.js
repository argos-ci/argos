import actionTypes from 'review/modules/redux/actionTypes'

function repositoryDetailsReducer(state, action) {
  if (state === undefined) {
    state = {
      fetch: {},
    }
  }

  switch (action.type) {
    case actionTypes.REPOSITORY_DETAILS_FETCH_TASK:
      return {
        ...state,
        fetch: action.payload,
      }
    default:
      return state
  }
}

export default repositoryDetailsReducer
