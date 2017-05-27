/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
/* eslint-disable no-underscore-dangle */

/**
 * Log the flow of the observable.
 */
export function debug(name, selector = x => x) {
  return this._do(value => {
    console.log(name, selector(value))
  })
}
