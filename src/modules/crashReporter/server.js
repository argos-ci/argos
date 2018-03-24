import raven from 'raven'
import config from 'config'
import { initializeCrashReporter } from 'modules/crashReporter/common'

export function initializeCrashReporterServer() {
  if (!config.get('sentry.serverDsn')) return

  if (process.env.NODE_ENV !== 'production') {
    // Prevent logging of useless information
    // https://github.com/getsentry/raven-node/blob/3f3d553cb02c7d69deeab4edaf928f739b17071f/docs/usage.rst#disable-console-alerts
    raven.disableConsoleAlerts()
  }

  initializeCrashReporter({
    DSN: config.get('sentry.serverDsn'),
    ravenConfig: {
      autoBreadcrumbs: true,
      release: config.get('releaseVersion'),
    },
  })

  // eslint-disable-next-line no-underscore-dangle
  global.__CRASH_REPORTER_LIB__ = raven
}

export const captureClientRelease = () => (req, res, next) => {
  if (req.headers['x-argos-release-version']) {
    raven.mergeContext({
      tags: { clientReleaseVersion: req.headers['x-argos-release-version'] },
    })
  } else if (req.headers['x-argos-cli-version']) {
    raven.mergeContext({
      tags: { clientCliVersion: req.headers['x-argos-cli-version'] },
    })
  }

  next()
}

export default raven
