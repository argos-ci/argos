/* eslint no-console: 0 */
import express from 'express';
import path from 'path';
import compress from 'compression';
import morgan from 'morgan';
import errorHandler from 'express-err';
import ejs from 'ejs';
import graphqlMiddleware from 'server/graphql/middleware';
import configureDatabase from 'server/configureDatabase';
import csp from 'server/csp';
import rendering from 'server/rendering';

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

configureDatabase();

const app = express();
app.disable('x-powered-by');
app.engine('html', ejs.renderFile);
app.set('views', __dirname);
app.use(morgan('dev'));
app.use(compress());
app.use(csp); // Content Security Policy
app.use(express.static(path.join(__dirname, '../../server/public'), {
  etag: true,
  lastModified: false,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-cache');
  },
}));
app.use('/static', express.static(path.join(__dirname, '../../server/static'), {
  etag: true,
  lastModified: false,
  maxAge: '1 year',
  index: false,
}));
app.use('/graphql', graphqlMiddleware());

// Error handling.
app.use((err, req, res, next) => {
  console.log(err.stack);
  next(err);
});
app.use(errorHandler({
  exitOnUncaughtException: false,
  formatters: ['json', 'text'],
}));

app.get('*', rendering);

export default app;
