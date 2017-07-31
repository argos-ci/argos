import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { appendFile, readdir } from 'mz/fs'
import config from 'config'
import display from '../../src/modules/scripts/display'

if (config.get('env') !== 'development') {
  throw new Error('You should only dump in development')
}

const execAsync = promisify(exec)
const getMigrationInserts = async () => {
  const migrations = await readdir(join(__dirname, '../../migrations'))
  return migrations
    .map(
      migration =>
        `INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('${migration}', 1, NOW());\n`
    )
    .join('')
}

execAsync(
  `docker-compose exec postgres pg_dump -s -U argos ${config.get('env')} > db/structure.sql`
)
  .then(async () => {
    const migrationInserts = await getMigrationInserts()
    return appendFile('db/structure.sql', `-- Knex migrations\n\n${migrationInserts}`)
  })
  .catch(err => {
    display.error(`${err.stderr}\n${err.stdout}`)
  })
