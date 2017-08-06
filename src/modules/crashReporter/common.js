/* eslint-disable no-underscore-dangle */

import raven from 'raven'

const production = process.env.NODE_ENV === 'production'

export function initializeCrashReporter(options) {
  const { DSN, ravenConfig } = options

  raven.config(production ? DSN : false, {
    environment: process.env.NODE_ENV, // Should always be production
    ...ravenConfig,
  })

  if (production) {
    raven.install()
  }
}

export default function crashReporter() {
  return {
    // We use __CRASH_REPORTER_LIB__ in order to be able to share code between the server and the client
    ...global.__CRASH_REPORTER_LIB__,
    captureException: (...args) => {
      if (process.env.NODE_ENV !== 'production') {
        // Useful for debugging
        // eslint-disable-next-line no-console
        console.warn('crashReporter.captureException', ...args)
      }

      global.__CRASH_REPORTER_LIB__.captureException(...args)
    },
    requestHandler: (...args) => {
      return global.__CRASH_REPORTER_LIB__.requestHandler(...args)
    },
    captureMessage: (...args) => {
      return global.__CRASH_REPORTER_LIB__.captureMessage(...args)
    },
    errorHandler: (...args) => {
      return global.__CRASH_REPORTER_LIB__.errorHandler(...args)
    },
  }
}
