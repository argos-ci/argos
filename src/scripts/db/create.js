import { execSync } from 'child_process'
import config from 'config'

if (process.env.NODE_ENV === 'production') {
  throw new Error('Not in production please!')
}

const CI = process.env.CI === 'true'
const user = 'argos'
const database = config.get('env')

const command = CI
  ? `createdb --host localhost -U ${user} ${database}`
  : `docker-compose exec -T postgres createdb -U ${user} ${database}`

execSync(command)
