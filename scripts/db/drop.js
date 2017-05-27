import { exec } from 'mz/child_process'
import config from 'config'

if (config.get('env') === 'production') {
  throw new Error('Not in production please!')
}

const travis = process.env.TRAVIS === 'true'

const command = travis
  ? `dropdb -U argos ${config.get('env')} --if-exists`
  : `docker-compose run postgres dropdb -h postgres -U argos ${config.get('env')} --if-exists`

exec(command).catch(err => {
  setTimeout(() => {
    throw err
  })
})
