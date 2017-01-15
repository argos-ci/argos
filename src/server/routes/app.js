/* eslint no-console: 0 */
import path from 'path';
import express from 'express';
import compress from 'compression';
import morgan from 'morgan';
import ejs from 'ejs';
import subdomain from 'express-subdomain';
import csp from 'server/middlewares/csp';
import www from 'server/routes/www';
import api from 'server/routes/api';

const app = express();
app.disable('x-powered-by');
app.engine('html', ejs.renderFile);
app.set('views', path.join(__dirname, '..'));
app.use(morgan('dev'));
app.use(compress());
app.use(csp); // Content Security Policy
app.use(subdomain('www', www));
app.use(subdomain('api', api));

export default app;
