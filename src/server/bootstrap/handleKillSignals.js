/* eslint-disable no-console */

/**
 * terminator === the termination handler
 * Terminate server on receipt of the specified signal.
 * @param {string} sig  Signal to terminate on.
 */
function terminator(sig) {
  if (typeof sig === 'string') {
    console.log(`${Date(Date.now())}: Received ${sig}.`);
    process.exit(1); // eslint-disable-line no-process-exit
  }

  console.log(`${Date(Date.now())}: Node server stopped.`);
}

const handleKillSignals = () => {
  //  Process on exit and signals.
  process.on('exit', () => {
    terminator();
  });

  // Removed 'SIGPIPE' from the list - bugz 852598.
  [
    'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
    'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM',
  ].forEach((element) => {
    process.on(element, () => {
      terminator(element);
    });
  });
};

export default handleKillSignals;
