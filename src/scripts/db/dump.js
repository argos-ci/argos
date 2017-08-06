import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { appendFile, readdir } from 'fs'
import config from 'config'
import display from 'modules/scripts/display'

if (config.get('env') !== 'development') {
  throw new Error('You should only dump in development')
}

const execAsync = promisify(exec)
const appendFileAsync = promisify(appendFile)
const readdirAsync = promisify(readdir)
const getMigrationInserts = async () => {
  const migrations = await readdirAsync(join(__dirname, '../../migrations'))
  return migrations
    .map(
      migration =>
        `INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('${migration}', 1, NOW());\n`
    )
    .join('')
}

execAsync(
  `docker-compose exec postgres pg_dump -s -U argos ${config.get(
    'env'
  )} > src/server/db/structure.sql`
)
  .then(async () => {
    const migrationInserts = await getMigrationInserts()
    return appendFileAsync(
      'src/server/db/structure.sql',
      `-- Knex migrations\n\n${migrationInserts}`
    )
  })
  .catch(err => {
    display.error(`${err.stderr}\n${err.stdout}`)
  })
