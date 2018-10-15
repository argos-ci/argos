import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import config from 'config'

if (process.env.NODE_ENV === 'production') {
  throw new Error('You should only dump in development')
}

const CI = process.env.CI === 'true'
const user = 'argos'
const database = config.get('env')
const structure = 'src/server/db/structure.sql'

function getMigrationInserts() {
  const migrations = fs.readdirSync(path.join(__dirname, '../../server/migrations'))
  return migrations
    .map(
      migration =>
        `INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('${migration}', 1, NOW());`
    )
    .join('\n')
}

const command = CI
  ? `pg_dump -h localhost -U ${user} ${database} --schema-only > ${structure}`
  : `docker-compose exec -T postgres pg_dump -U ${user} ${database} --schema-only > ${structure}`

execSync(command)
fs.appendFileSync(structure, `\n\n${getMigrationInserts()}`, 'utf-8')
