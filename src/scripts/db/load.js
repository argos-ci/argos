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
  ? `psql --host localhost -U ${user} ${database} < src/server/db/structure.sql`
  : `docker exec -i \`docker-compose ps -q postgres\` psql -U ${user} ${database} < src/server/db/structure.sql`

execAsync(command).catch(err => {
  display.error(`${err.stderr}\n${err.stdout}`)
  process.exit(1)
})
