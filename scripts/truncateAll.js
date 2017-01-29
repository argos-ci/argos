import { truncateAll } from '../src/server/testUtils'
import { connect, disconnect } from '../src/server/database'

const knex = connect()

truncateAll(knex)
  .then(() => {
    disconnect(knex)
  })
  .catch(() => {
    disconnect(knex)
  })
