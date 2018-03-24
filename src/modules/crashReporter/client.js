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
    DSN: 'https://9cb925a0634f4f78896523e9dea07b7a@sentry.io/533428',
    ravenConfig: {
      release: configBrowser.get('releaseVersion'),
    },
  })

  global.__CRASH_REPORTER_LIB__ = raven
  global.__CRASH_REPORTER_INITIALIZED__ = true
}

export default raven
