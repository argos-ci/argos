import { execSync } from 'child_process'
import config from 'config'

if (process.env.NODE_ENV === 'production') {
  throw new Error('Not in production please!')
}

const CI = process.env.CI === 'true'
const user = 'argos'
const database = config.get('env')

const command = CI
  ? `psql -v ON_ERROR_STOP=1 --host localhost -U ${user} ${database} < src/server/db/structure.sql`
  : `docker-compose exec -T postgres psql -v ON_ERROR_STOP=1 -U ${user} ${database} < src/server/db/structure.sql`

execSync(command)
