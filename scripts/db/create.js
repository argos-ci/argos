/* eslint-disable max-len */
import { exec } from 'mz/child_process'
import config from 'config'

if (config.get('env') === 'production') {
  throw new Error('Not in production please!')
}

const travis = process.env.TRAVIS === 'true'

const command = travis
  ? `createdb -U argos ${config.get('env')}`
  : `docker-compose run postgres createdb -h postgres -U argos ${config.get('env')}`

exec(command).catch(err => {
  setTimeout(() => {
    throw err
  })
})
