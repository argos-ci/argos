// @flow weak

let raven
let DSN
let ravenConfig

if (process.env.PLATFORM === 'browser') {
  raven = require('raven-js')
  if (process.env.NODE_ENV === 'production') {
    DSN = 'https://f1690f74cc6e432e922f32da3eb051c9@sentry.io/133417'
  } else {
    DSN = false
  }
  ravenConfig = {
    release: window.clientData.releaseVersion,
  }
} else {
  raven = require('raven')
  if (process.env.NODE_ENV === 'production') {
    DSN = 'https://261cb80891cb480fa452f7e18c0e57c0:dc050bb97a4d4692aa3e957c5c89d393@sentry.io/133418'
  } else {
    DSN = false
  }
  ravenConfig = {
    autoBreadcrumbs: true,
    release: require('../../config').default.get('heroku.releaseVersion'),
  }
}

const crashReporter = {
  init: () => {
    raven.config(DSN, {
      environment: process.env.NODE_ENV, // Should always be production
      ...ravenConfig,
    })
    raven.install()
  },
  captureException: (...args) => raven.captureException(...args),
  requestHandler: () => raven.requestHandler(),
  errorHandler: () => raven.errorHandler(),
}

export default crashReporter
