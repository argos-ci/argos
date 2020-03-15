import Knex from 'knex'
import config from '@argos-ci/config'

export const knex = Knex(config.get('pg'))

process.on('SIGTERM', () => {
  knex.destroy()
})
