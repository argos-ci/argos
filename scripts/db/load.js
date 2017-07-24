import { exec } from 'child_process'
import { promisify } from 'util'
import config from 'config'
import { displayError } from '../../src/modules/scripts/display'

if (config.get('env') === 'production') {
  throw new Error('Not in production please!')
}

const execAsync = promisify(exec)
const CI = process.env.CI === 'true'

const command = CI
  ? `psql --host localhost -U argos ${config.get('env')} < db/structure.sql`
  : `docker exec -i \`docker-compose ps -q postgres\` psql -U argos ${config.get(
      'env'
    )} < db/structure.sql`

execAsync(command).catch(err => {
  displayError(`${err.stderr}\n${err.stdout}`)
})
