/* eslint-disable no-console */

import 'server/bootstrap/setup';

import http from 'http';
import config from 'config';
import app from 'server/routes/app';

const server = http.createServer(app);

server.listen(config.get('server.port'), () => {
  console.log(`${Date(Date.now())}: http://localhost:${server.address().port}/`);
});
