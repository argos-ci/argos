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
  ? `dropdb --host localhost -U ${user} ${database} --if-exists`
  : `docker-compose exec -T postgres \
  bash -c 'psql -U ${user} ${database} -c "REVOKE CONNECT ON DATABASE ${database} FROM public" \
  && dropdb -U ${user} ${database}'`

execAsync(command).catch(err => {
  display.error(`${err.stderr}\n${err.stdout}`)
  process.exit(1)
})
