import actionTypes from 'redux/actionTypes';

function buildReducer(state, action) {
  if (state === undefined) {
    state = {};
  }

  switch (action.type) {
    case actionTypes.BUILD_FETCH_TASK:
      return {
        ...state,
        payload: action.payload,
      };
    default:
      return state;
  }
}

export default buildReducer;
