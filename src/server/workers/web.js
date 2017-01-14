/* eslint-disable import/first, no-console */

import http from 'http';
import config from 'config';
import app from 'server/app';

const server = http.createServer(app);

server.listen(config.get('server.port'), () => {
  console.log(`${Date(Date.now())}: http://localhost:${server.address().port}/`);
});
