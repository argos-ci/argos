import knex from 'knex'
import { Model } from 'objection'
import config from 'config'
import knexConfig from '../../../knexfile'

let knexInstance

export function connect() {
  if (!knexInstance) {
    knexInstance = knex(knexConfig[config.get('env')])
    Model.knex(knexInstance)
  }

  return knexInstance
}

export async function disconnect() {
  if (!knexInstance) {
    return
  }

  await knexInstance.destroy()
  knexInstance = null
}
