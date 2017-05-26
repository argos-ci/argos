import 'server/bootstrap/setup'
import http from 'http'
import config from 'config'
import { addCloseCallback } from 'server/bootstrap/handleKillSignals'
import app from 'server/routes/app'

const server = http.createServer(app)

server.listen(config.get('server.port'), (err) => {
  if (err) {
    throw err
  }

  // eslint-disable-next-line no-console
  console.log(`${Date(Date.now())}: http://localhost:${server.address().port}/`)
})

addCloseCallback(() => {
  server.close()
})
