/* eslint-disable no-console */

import '@risingstack/trace'
import { connect } from 'server/services/database'
import handleKillSignals from 'server/bootstrap/handleKillSignals'
import { initializeCrashReporterServer } from 'modules/crashReporter/server'
import crashReporter from 'modules/crashReporter/common'

connect()
handleKillSignals()
initializeCrashReporterServer()

process.on('error', error => {
  crashReporter().captureException(error)
  throw error
})

process.on('unhandledRejection', (reason, promise) => {
  console.log('unhandledRejection', 'reason', reason)
  console.log('unhandledRejection', 'promise', promise)
})
