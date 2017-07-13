import { exec } from 'child_process'
import { promisify } from 'util'
import config from 'config'
import display from '../../src/modules/scripts/display'

if (config.get('env') === 'production') {
  throw new Error('Not in production please!')
}

const execAsync = promisify(exec)
const CI = process.env.CI === 'true'

const command = CI
  ? `dropdb --host localhost -U argos ${config.get('env')} --if-exists`
  : `docker-compose run postgres dropdb -h postgres -U argos ${config.get('env')} --if-exists`

execAsync(command).catch(err => {
  display.error(`${err.stderr}\n${err.stdout}`)
})
