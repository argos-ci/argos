import Knex from 'knex'
import config from '@argos-ci/config'
import { transaction } from './transaction'

export const knex = Knex(config.get('pg'))
transaction.knex(knex)

process.on('SIGTERM', () => {
  knex.destroy()
})
