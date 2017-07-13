/* eslint-disable no-console, no-underscore-dangle */

import { initializeCrashReporterServer } from 'modules/crashReporter/server'

// Add until method to enzyme Wrapper
import 'modules/enzyme/add/until'
import consoleError from './consoleError'

initializeCrashReporterServer()
consoleError()

if (!process.env.__LISTENING_TO_UNHANDLED_REJECTION__) {
  // Avoid memory leak by adding too many listeners
  process.env.__LISTENING_TO_UNHANDLED_REJECTION__ = true

  process.on('unhandledRejection', (reason, promise) => {
    console.log('unhandledRejection', 'reason', reason)
    console.log('unhandledRejection', 'promise', promise)
  })
}
