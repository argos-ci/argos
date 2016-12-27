/* eslint no-console: 0 */
import express from 'express';
import http from 'http';
import path from 'path';
import compress from 'compression';
import morgan from 'morgan';
import errorHandler from 'express-err';
import ejs from 'ejs';
import graphqlMiddleware from 'server/graphql/middleware';
import config from 'config';
import configureDatabase from './configureDatabase';

configureDatabase();

const app = express();

app.engine('html', ejs.renderFile);
app.set('views', __dirname);

app.use(morgan('dev'));
app.use(compress());

app.use(express.static(path.join(__dirname, '../../public')));

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

const server = http.createServer(app);
server.listen(config.get('server.port'), () => {
  console.log('App listening at port %s', server.address().port);
});
