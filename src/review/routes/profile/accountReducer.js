/* eslint-disable max-len */
import actionTypes from 'modules/redux/actionTypes'
import { SUCCESS } from 'modules/rxjs/operator/watchTask'

function accountReducer(state, action) {
  if (state === undefined) {
    state = {
      fetch: {},
    }
  }

  switch (action.type) {
    case actionTypes.ACCOUNT_FETCH_TASK:
      return {
        ...state,
        fetch: action.payload,
      }
    case actionTypes.ACCOUNT_TOGGLE_CLICK:
      if (state.fetch.state === SUCCESS) {
        return {
          ...state,
          fetch: {
            ...state.fetch,
            output: {
              ...state.fetch.output,
              data: {
                ...state.fetch.output.data,
                user: {
                  ...state.fetch.output.data.user,
                  relatedRepositories: state.fetch.output.data.user.relatedRepositories.reduce(
                    (all, repository) => [
                      ...all,
                      repository.id === action.payload.repositoryId
                        ? { ...repository, enabled: action.payload.enabled }
                        : repository,
                    ],
                    []
                  ),
                },
              },
            },
          },
        }
      }
      return state
    case actionTypes.ACCOUNT_TOGGLE_TASK:
      if (state.fetch.state !== SUCCESS) {
        return state
      }

      if (action.payload.state === SUCCESS) {
        return {
          ...state,
          fetch: {
            ...state.fetch,
            output: {
              ...state.fetch.output,
              data: {
                ...state.fetch.output.data,
                user: {
                  ...state.fetch.output.data.user,
                  relatedRepositories: state.fetch.output.data.user.relatedRepositories.reduce(
                    (all, repository) => [
                      ...all,
                      repository.id === action.payload.output.data.toggleRepository.id
                        ? {
                            ...repository,
                            enabled: action.payload.output.data.toggleRepository.enabled,
                          }
                        : repository,
                    ],
                    []
                  ),
                },
              },
            },
          },
        }
      }
      return state
    default:
      return state
  }
}

export default accountReducer
