import { execSync } from 'child_process'
import config from 'config'

if (process.env.NODE_ENV === 'production') {
  throw new Error('Not in production please!')
}

const CI = process.env.CI === 'true'
const user = 'argos'
const database = config.get('env')

if (!CI) {
  execSync(
    `docker-compose exec -T postgres psql -U ${user} ${database} -c "REVOKE CONNECT ON DATABASE ${database} FROM public" 2>/dev/null || true`
  )
}

const command = CI
  ? `dropdb --host localhost -U ${user} ${database} --if-exists`
  : `docker-compose exec -T postgres dropdb -U ${user} ${database} --if-exists`

execSync(command)
