/* eslint-disable max-len */
import { exec } from 'mz/child_process'
import config from 'config'

if (config.get('env') === 'production') {
  throw new Error('Not in production please!')
}

exec(`docker exec -i \`docker-compose ps -q postgres\` psql -U argos ${config.get('env')} < db/structure.sql`)
  .catch((err) => {
    setTimeout(() => { throw err })
  })
