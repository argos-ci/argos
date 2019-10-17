import actionTypes from 'modules/redux/actionTypes'

function dashboardReducer(state, action) {
  if (state === undefined) {
    state = {
      fetch: {},
    }
  }

  switch (action.type) {
    case actionTypes.DASHBOARD_FETCH_TASK:
      return {
        ...state,
        fetch: action.payload,
      }
    default:
      return state
  }
}

export default dashboardReducer
