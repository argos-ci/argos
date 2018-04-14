import { exec } from 'child_process'
import util from 'util'
import fs from 'fs'
import path from 'path'
import config from 'config'
import display from 'modules/scripts/display'

if (process.env.NODE_ENV === 'production') {
  throw new Error('You should only dump in development')
}

const execAsync = util.promisify(exec)
const readdirAsync = util.promisify(fs.readdir)
const readFileAsync = util.promisify(fs.readFile)
const writeFileAsync = util.promisify(fs.writeFile)
const user = 'argos'
const database = config.get('env')
const structure = 'src/server/db/structure.sql'

async function getMigrationInserts() {
  const migrations = await readdirAsync(path.join(__dirname, '../../server/migrations'))
  return migrations
    .map(
      migration =>
        `INSERT INTO knex_migrations(name, batch, migration_time) VALUES ('${migration}', 1, NOW());\n`
    )
    .join('')
}

execAsync(
  `docker-compose exec -T postgres pg_dump -U ${user} ${database} --schema-only > ${structure}`
)
  .then(async () => {
    let data = await readFileAsync(structure, 'utf-8')
    const migrationInserts = await getMigrationInserts()

    data += `\n\n${migrationInserts}`

    await writeFileAsync(structure, data, 'utf-8')
  })
  .catch(err => {
    display.error(`${err.stderr}\n${err.stdout}`)
    process.exit(1)
  })
