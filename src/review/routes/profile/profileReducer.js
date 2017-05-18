import actionTypes from 'modules/redux/actionTypes'

function profileReducer(state, action) {
  if (state === undefined) {
    state = {
      fetch: {},
    }
  }

  switch (action.type) {
    case actionTypes.PROFILE_FETCH_TASK:
      return {
        ...state,
        fetch: action.payload,
      }
    default:
      return state
  }
}

export default profileReducer
