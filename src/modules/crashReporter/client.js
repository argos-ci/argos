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
    DSN: 'https://e2b4a90bdcc64abf9f446d6612b16471@sentry.io/237155',
    ravenConfig: {
      release: configBrowser.get('releaseVersion'),
    },
  })

  global.__CRASH_REPORTER_LIB__ = raven
  global.__CRASH_REPORTER_INITIALIZED__ = true
}

export default raven
