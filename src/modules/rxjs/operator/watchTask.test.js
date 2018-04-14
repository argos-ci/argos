import { subscribeAsync } from 'modules/rxjs/test/subscribeAsync'
import { Observable } from 'modules/rxjs'
import { PROGRESS, ERROR, SUCCESS } from './watchTask'

describe('modules/rxjs/operator/watchTask', () => {
  it('should push progress state', () =>
    subscribeAsync(Observable.of(null).watchTask('action', () => new Promise(() => {})), 1).then(
      spy => {
        const [[event]] = spy.args
        expect(event.payload.state).toBe(PROGRESS)
      }
    ))

  it('should forward source argument', () =>
    subscribeAsync(
      Observable.of('foo').watchTask('action', foo => new Promise(() => expect(foo).toBe('foo'))),
      1
    ))

  describe('given resolved promise', () => {
    it('should push success test', () =>
      subscribeAsync(Observable.of(null).watchTask('action', () => Promise.resolve()), 2).then(
        spy => {
          const [, [event]] = spy.args
          expect(event.payload.state).toBe(SUCCESS)
        }
      ))

    it('should push output', () =>
      subscribeAsync(Observable.of(null).watchTask('action', () => Promise.resolve('bar')), 2).then(
        spy => {
          const [, [event]] = spy.args
          expect(event.payload.output).toBe('bar')
        }
      ))
  })

  describe('given rejected promise', () => {
    it('should push error test', () =>
      subscribeAsync(Observable.of(null).watchTask('action', () => Promise.reject()), 2).then(
        spy => {
          const [, [event]] = spy.args
          expect(event.payload.state).toBe(ERROR)
        }
      ))

    it('should push output', () =>
      subscribeAsync(Observable.of(null).watchTask('action', () => Promise.reject('bar')), 2).then(
        spy => {
          const [, [event]] = spy.args
          expect(event.payload.output).toBe('bar')
        }
      ))
  })
})
