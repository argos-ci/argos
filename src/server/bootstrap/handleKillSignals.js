import display from 'modules/scripts/display'

const SHUTDOWN_TIMEOUT = 3000

let isShuttingDown = false
const teardowns = []

/**
 * shutdown === the termination handler
 * Terminate server on receipt of the specified signal.
 * @param {string} signal  Signal to terminate on.
 */
export async function shutdown(signal) {
  if (typeof signal === 'string') {
    display.info(`Received ${signal}.`)
  }

  // At the first soft kill signal, we try to shutdown the service gracefully.
  if ((signal === 'SIGTERM' || signal === 'SIGINT') && !isShuttingDown) {
    isShuttingDown = true
    display.info('Shutdown server gracefully...')
    display.info(`${SHUTDOWN_TIMEOUT}ms before killing it.`)
    const timer = setTimeout(() => {
      display.error('Force shutdown')
      shutdown()
    }, SHUTDOWN_TIMEOUT)

    const teardownsSorted = teardowns.sort((a, b) => b.nice - a.nice)

    for (let i = 0; i < teardownsSorted.length; i += 1) {
      const teardown = teardownsSorted[i]
      await teardown.callback() // eslint-disable-line no-await-in-loop
    }

    clearTimeout(timer)
    process.exit(0)
    return
  }

  process.exit(1) // eslint-disable-line no-process-exit
}

function handleKillSignals() {
  //  Process on exit and signals.
  process.on('exit', () => {
    display.success('Node server stopped.')
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
      shutdown(signal)
    })
  })
}

export function addTeardown(teardown) {
  teardowns.push(teardown)
}

export default handleKillSignals
