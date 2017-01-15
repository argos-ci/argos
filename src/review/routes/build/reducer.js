import actionTypes from 'review/redux/actionTypes';

function buildReducer(state, action) {
  if (state === undefined) {
    state = {
      fetch: {},
    };
  }

  switch (action.type) {
    case actionTypes.BUILD_FETCH_TASK:
      return {
        ...state,
        fetch: action.payload,
      };
    default:
      return state;
  }
}

export default buildReducer;
