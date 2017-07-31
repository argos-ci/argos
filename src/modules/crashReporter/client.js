/* eslint-disable no-underscore-dangle */

import raven from 'raven-js'
import warning from 'warning'
import configBrowser from 'configBrowser'
import { initializeCrashReporter } from 'modules/crashReporter/common'

export function initializeCrashReporterClient() {
  // Raven should be initialize with the server.js module on the server.
  warning(process.browser, 'You are not supposed to call initializeCrashReporter on the server.')

  // Initialize only once on the browser
  if (global.__CRASH_REPORTER_INITIALIZED__) {
    return
  }

  initializeCrashReporter({
    DSN: 'https://f1690f74cc6e432e922f32da3eb051c9@sentry.io/133417',
    ravenConfig: {
      release: configBrowser.get('releaseVersion'),
    },
  })

  global.__CRASH_REPORTER_LIB__ = raven
  global.__CRASH_REPORTER_INITIALIZED__ = true
}

export default raven
