import { ActionsObservable } from 'redux-observable'
import { Subject } from 'modules/rxjs'
import { subscribeAsync } from 'modules/rxjs/test/subscribeAsync'
import { SUCCESS } from 'modules/rxjs/operator/watchTask'
import actionTypes from 'modules/redux/actionTypes'
import buildEpic from './buildEpic'

jest.mock('modules/graphql/client')
const graphQLClient = require('modules/graphql/client').default

describe('buildEpic', () => {
  describe('fetchEpic', () => {
    it('should trigger a fetch when the validation is updated', () => {
      const subject = new Subject()
      const actions$ = new ActionsObservable(subject)
      const epic$ = buildEpic(actions$)

      graphQLClient.fetch.mockImplementation(() =>
        Promise.resolve({
          data: {},
        })
      )

      const promise = subscribeAsync(epic$, 3)

      subject.next({
        type: actionTypes.BUILD_FETCH,
        payload: {
          buildId: 1,
        },
      })
      subject.next({
        type: actionTypes.BUILD_VALIDATION_TASK,
        payload: {
          state: SUCCESS,
        },
      })

      return promise.then(spy => {
        expect(spy.args[2][0].payload.state).toBe(SUCCESS)
      })
    })
  })
})
