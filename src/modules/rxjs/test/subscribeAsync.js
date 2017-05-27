import { spy } from 'sinon'

export const subscribeAsync = (observable, expectedEmissionsCount = 1) => {
  if (!Number.isInteger(expectedEmissionsCount)) {
    throw TypeError(`Invalid parameter expectedEmissionsCount: ${expectedEmissionsCount}`)
  }

  return new Promise((resolve, reject) => {
    const handle = spy()

    const subscription = observable
      .do(handle)
      .startWith(null)
      .scan(emissionsCount => emissionsCount + 1, -1)
      .debounceTime(0)
      .delay(0) // So that the observer always gets notified asynchronously.
      .subscribe(emissionsCount => {
        if (emissionsCount < expectedEmissionsCount) {
          return
        }
        subscription.unsubscribe()
        expect(expectedEmissionsCount).toBe(
          emissionsCount,
          `expected observable to emit ${expectedEmissionsCount} times, ` +
            `emitted ${emissionsCount} times instead`
        )
        resolve(handle)
      }, reject)
  })
}

export default subscribeAsync
