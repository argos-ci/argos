/* eslint-disable no-console */

import * as services from 'server/services/all'

const SHUTDOWN_TIMEOUT = 3000

let shutdown
const callbacks = [() => services.disconnect()]

function log(message) {
  console.info(`${new Date().toJSON()}: ${message}`)
}

/**
 * terminator === the termination handler
 * Terminate server on receipt of the specified signal.
 * @param {string} signal  Signal to terminate on.
 */
function terminator(signal) {
  if (typeof signal === 'string') {
    log(`Received ${signal}.`)
  }

  // At the first SIGTERM, we try to shutdown the service gracefully
  if ((signal === 'SIGTERM' || signal === 'SIGINT') && !shutdown) {
    log('Shutdown server gracefully...')
    log(`${SHUTDOWN_TIMEOUT}ms before killing it.`)
    callbacks.forEach(callback => callback())
    setTimeout(() => terminator(), SHUTDOWN_TIMEOUT)
    shutdown = true
    return
  }

  process.exit(1) // eslint-disable-line no-process-exit
}

function handleKillSignals() {
  //  Process on exit and signals.
  process.on('exit', () => {
    log('Node server stopped.')
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
