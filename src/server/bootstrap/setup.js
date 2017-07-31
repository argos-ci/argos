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
  // eslint-disable-next-line no-console
  console.log('unhandledRejection', 'reason', reason)
  // eslint-disable-next-line no-console
  console.log('unhandledRejection', 'promise', promise)
})
