import actionTypes from 'modules/redux/actionTypes'
import { PROGRESS, SUCCESS } from 'modules/rxjs/operator/watchTask'
import detailsReducer from './detailsReducer'

describe('detailsReducer', () => {
  describe('REPOSITORY_DETAILS_FETCH_TASK', () => {
    it('should keep the old state', () => {
      const action1 = {
        type: actionTypes.REPOSITORY_DETAILS_FETCH_TASK,
        payload: {
          state: PROGRESS,
          input: {
            payload: {
              after: 0,
            },
          },
          output: {},
        },
      }

      const action2 = {
        type: actionTypes.REPOSITORY_DETAILS_FETCH_TASK,
        payload: {
          state: SUCCESS,
          input: {
            payload: {
              after: 0,
            },
          },
          output: {
            data: {
              repository: {
                builds: {
                  edges: [1, 2],
                },
              },
            },
          },
        },
      }

      const action3 = {
        type: actionTypes.REPOSITORY_DETAILS_FETCH_TASK,
        payload: {
          state: PROGRESS,
          input: {
            payload: {
              after: 5,
            },
          },
          output: {},
        },
      }

      const action4 = {
        type: actionTypes.REPOSITORY_DETAILS_FETCH_TASK,
        payload: {
          state: SUCCESS,
          input: {
            payload: {
              after: 5,
            },
          },
          output: {
            data: {
              repository: {
                builds: {
                  edges: [3],
                },
              },
            },
          },
        },
      }

      let state
      state = detailsReducer(state, action1)
      state = detailsReducer(state, action2)
      expect(state.fetch.output.data.repository.builds.edges).toEqual([1, 2])
      state = detailsReducer(state, action3)
      expect(state.fetch.output.data.repository.builds.edges).toEqual([1, 2])
      state = detailsReducer(state, action4)
      expect(state.fetch.output.data.repository.builds.edges).toEqual([1, 2, 3])
    })
  })
})
