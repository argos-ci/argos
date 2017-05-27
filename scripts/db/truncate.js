import config from 'config'
import { truncateAll } from 'server/test/utils'
import { connect, disconnect } from 'server/services/database'

if (config.get('env') === 'production') {
  throw new Error('Not in production please!')
}

const knex = connect()

truncateAll(knex)
  .then(() => {
    disconnect(knex)
  })
  .catch(err => {
    setTimeout(() => {
      throw err
    })
  })
