/* eslint-disable max-len */
import { exec } from 'mz/child_process'
import config from 'config'

if (config.get('env') === 'production') {
  throw new Error('Not in production please!')
}

const CI = process.env.CI === 'true'

const command = CI
  ? `psql --host localhost -U argos ${config.get('env')} < db/structure.sql`
  : `docker exec -i \`docker-compose ps -q postgres\` psql -U argos ${config.get(
      'env'
    )} < db/structure.sql`

exec(command).catch(err => {
  setTimeout(() => {
    throw err
  })
})
