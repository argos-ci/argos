// @flow weak

let raven
let DSN

if (process.env.PLATFORM === 'browser') {
  raven = require('raven-js')
  DSN = 'https://f1690f74cc6e432e922f32da3eb051c9@sentry.io/133417'
} else {
  raven = require('raven')
  DSN = 'https://261cb80891cb480fa452f7e18c0e57c0:dc050bb97a4d4692aa3e957c5c89d393@sentry.io/133418'
}

const crashReporter = {
  init: () => {
    raven.config(DSN, {
      environment: process.env.NODE_ENV, // Should always be production
    })

    if (process.env.NODE_ENV === 'production') {
      raven.install()
    }
  },
  captureException: (...args) => raven.captureException(...args),
  requestHandler: () => raven.requestHandler(),
  errorHandler: () => raven.errorHandler(),
}

export default crashReporter
