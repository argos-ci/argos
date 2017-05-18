import '@risingstack/trace'
import { connect } from 'server/services/database'
import handleKillSignals from 'server/bootstrap/handleKillSignals'
import crashReporter, { initializeCrashReporter } from 'modules/crashReporter'

handleKillSignals()
connect()
initializeCrashReporter()

process.on('error', (error) => {
  crashReporter.captureException(error)
  throw error
})
