import actionTypes from 'modules/redux/actionTypes'
import { PROGRESS } from 'modules/rxjs/operator/watchTask'

function detailsReducer(state, action) {
  if (state === undefined) {
    state = {
      fetch: {},
    }
  }

  switch (action.type) {
    case actionTypes.REPOSITORY_DETAILS_FETCH_TASK: {
      const newState = {
        ...state,
        fetch: action.payload,
      }

      if (action.payload.input.payload.after !== 0) {
        // Keep old output
        if (action.payload.state === PROGRESS) {
          return {
            ...newState,
            fetch: {
              ...newState.fetch,
              output: state.fetch.output,
            },
          }
        }

        newState.fetch.output.data.repository.builds.edges = [
          ...state.fetch.output.data.repository.builds.edges,
          ...newState.fetch.output.data.repository.builds.edges,
        ]

        return newState
      }
      return newState
    }
    default:
      return state
  }
}

export default detailsReducer
