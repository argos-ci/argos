import actionTypes from 'modules/redux/actionTypes'

function repositoryReducer(state, action) {
  if (state === undefined) {
    state = {
      fetch: {},
    }
  }

  switch (action.type) {
    case actionTypes.REPOSITORY_FETCH_TASK:
      return {
        ...state,
        fetch: action.payload,
      }
    default:
      return state
  }
}

export default repositoryReducer
