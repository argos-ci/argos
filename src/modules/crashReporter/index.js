/* eslint-disable global-require */
import raven from 'raven'

const production = process.env.NODE_ENV === 'production'

let DSN
let ravenConfig

if (process.env.PLATFORM === 'browser') {
  DSN = 'https://f1690f74cc6e432e922f32da3eb051c9@sentry.io/133417'
  ravenConfig = {
    release: window.clientData.releaseVersion,
  }
} else {
  DSN = 'https://261cb80891cb480fa452f7e18c0e57c0:dc050bb97a4d4692aa3e957c5c89d393@sentry.io/133418'
  ravenConfig = {
    autoBreadcrumbs: true,
    release: require('../../config').default.get('heroku.releaseVersion'),
  }

  if (!production) {
    // Prevent logging of useless information
    // https://github.com/getsentry/raven-node/blob/3f3d553cb02c7d69deeab4edaf928f739b17071f/docs/usage.rst#disable-console-alerts
    raven.disableConsoleAlerts()
  }
}

export function initializeCrashReporter() {
  raven.config(production ? DSN : false, {
    environment: process.env.NODE_ENV, // Should always be production
    ...ravenConfig,
  })

  if (production) {
    raven.install()
  }
}

export const captureClientRelease = () => (req, res, next) => {
  if (req.headers['x-argos-release']) {
    raven.mergeContext({
      tags: { clientRelease: req.headers['x-argos-release'] },
    })
  }

  next()
}

export default raven
