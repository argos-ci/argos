import { join } from 'path'
import { exec } from 'mz/child_process'
import { appendFile, readdir } from 'mz/fs'
import config from 'config'

if (config.get('env') !== 'development') {
  throw new Error('You should only dump in development')
}

const getMigrationInserts = async () => {
  const migrations = await readdir(join(__dirname, '../../migrations'))
  return migrations.map(migration =>
    `INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('${migration}', 1, NOW());\n`,
  ).join('')
}

exec('docker-compose exec postgres pg_dump -s -U argos > db/structure.sql')
  .then(async () => {
    const migrationInserts = await getMigrationInserts()
    return appendFile('db/structure.sql', `-- Knex migrations\n\n${migrationInserts}`)
  })
  .catch((err) => {
    setTimeout(() => { throw err })
  })
