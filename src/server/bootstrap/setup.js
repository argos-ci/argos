import { connect } from 'server/database'
import handleKillSignals from 'server/bootstrap/handleKillSignals'
import crashReporter from 'modules/crashReporter/crashReporter'

handleKillSignals()
connect()
crashReporter.init()

process.on('error', (error) => {
  crashReporter.captureException(error)
  throw error
})
