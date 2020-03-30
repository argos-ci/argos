import '../setup'
import http from 'http'
import config from '@argos-ci/config'
import { app } from '@argos-ci/web'
import logger from '@argos-ci/logger'

const server = http.createServer(app)

server.listen(config.get('server.port'), (err) => {
  if (err) throw err
  logger.info(`Ready on http://localhost:${server.address().port}`)
})

process.on('SIGTERM', () => {
  server.close((err) => {
    if (err) throw err
  })
})
