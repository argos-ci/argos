import Knex from 'knex'
import { Model } from 'objection'
import config from 'config'
import knexConfig from '../../knexfile'

export const connect = (env = config.get('env')) => {
  const knex = Knex(knexConfig[env])
  Model.knex(knex)
  return knex
}

export const disconnect = (knex) => {
  return new Promise((resolve, reject) => {
    knex.destroy((err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
