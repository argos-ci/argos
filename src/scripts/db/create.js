import { exec } from 'child_process'
import util from 'util'
import config from 'config'
import display from 'modules/scripts/display'

if (process.env.NODE_ENV === 'production') {
  throw new Error('Not in production please!')
}

const execAsync = util.promisify(exec)
const CI = process.env.CI === 'true'
const user = 'argos'
const database = config.get('env')

const command = CI
  ? `createdb --host localhost -U ${user} ${database}`
  : `docker-compose exec -T postgres \
  createdb -U ${user} ${database}`

execAsync(command).catch(err => {
  display.error(`${err.stderr}\n${err.stdout}`)
  process.exit(1)
})
