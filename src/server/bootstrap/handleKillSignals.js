import { displayError, displayInfo, displaySuccess } from 'modules/scripts/display'
import * as services from 'server/services/all'

const SHUTDOWN_TIMEOUT = 3000

let shutdown = false
const callbacks = [() => services.disconnect()]

/**
 * terminator === the termination handler
 * Terminate server on receipt of the specified signal.
 * @param {string} signal  Signal to terminate on.
 */
function terminator(signal) {
  if (typeof signal === 'string') {
    displayInfo(`Received ${signal}.`)
  }

  // At the first SIGTERM, we try to shutdown the service gracefully
  if ((signal === 'SIGTERM' || signal === 'SIGINT') && !shutdown) {
    displayInfo('Shutdown server gracefully...')
    displayInfo(`${SHUTDOWN_TIMEOUT}ms before killing it.`)
    const timer = setTimeout(() => {
      displayError('Force shutdown')
      terminator()
    }, SHUTDOWN_TIMEOUT)
    Promise.all(callbacks.map(callback => callback())).then(() => {
      clearTimeout(timer)
      process.exit(0)
    })
    shutdown = true
    return
  }

  process.exit(1)
}

function handleKillSignals() {
  //  Process on exit and signals.
  process.on('exit', () => {
    displaySuccess('Node server stopped.')
  })

  // Removed 'SIGPIPE' from the list - bugz 852598.
  ;[
    'SIGHUP',
    'SIGINT',
    'SIGQUIT',
    'SIGILL',
    'SIGTRAP',
    'SIGABRT',
    'SIGBUS',
    'SIGFPE',
    'SIGUSR1',
    'SIGSEGV',
    'SIGUSR2',
    'SIGTERM',
  ].forEach(signal => {
    process.on(signal, () => {
      terminator(signal)
    })
  })
}

export function addCloseCallback(callback) {
  callbacks.push(callback)
}

export default handleKillSignals
