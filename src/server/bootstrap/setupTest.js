/* eslint-disable no-console */

process.env.NODE_ENV = 'test'

jest.mock('server/jobs/build')
jest.mock('server/jobs/screenshotDiff')
jest.mock('server/jobs/synchronize')

/**
 * Makes sure the tests fails when a PropType validation fails.
 */
function consoleError() {
  console.error = (...args) => {
    console.log(...args)
    throw new Error(...args)
  }
}

consoleError()
