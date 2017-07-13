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
  ? `createdb --host localhost -U argos ${config.get('env')}`
  : `docker-compose run postgres createdb -h postgres -U argos ${config.get('env')}`

execAsync(command).catch(err => {
  displayError(`${err.stderr}\n${err.stdout}`)
})
