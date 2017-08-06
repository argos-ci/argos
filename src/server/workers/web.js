import 'server/bootstrap/setup'
// --- Post bootstrap -----
import http from 'http'
import config from 'config'
import display from 'modules/scripts/display'
import { addTeardown } from 'server/bootstrap/handleKillSignals'
import * as services from 'server/services/all'
import app from 'server/routes/app'

const server = http.createServer(app)

server.listen(config.get('server.port'), err => {
  if (err) {
    throw err
  }

  display.info(`Ready on http://localhost:${server.address().port}`)
})

addTeardown({
  callback: () => {
    return new Promise((resolve, reject) => {
      server.close(err => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  },
  nice: 2,
})

addTeardown({
  callback: () => services.disconnect(),
  nice: 1,
})
