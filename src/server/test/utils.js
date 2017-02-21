/* eslint-disable no-console */
/* global jasmine */
import { connect, disconnect } from 'server/database'

const KNEX_TABLES = ['knex_migrations', 'knex_migrations_lock']

export async function truncateAll(knex) {
  const result = await knex.schema.raw(
    'SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\'',
  )

  const tables = result.rows.reduce((tables, { tablename }) => (
    KNEX_TABLES.includes(tablename) ? tables : [...tables, tablename]
  ), [])

  return knex.schema.raw(`TRUNCATE ${tables.join(',')} CASCADE`)
}

export const useDatabase = () => {
  let knex

  beforeEach(async function () {
    knex = connect('test')
    await knex.migrate.latest()
    await truncateAll(knex)
  })

  afterEach(async function () {
    await disconnect(knex)
  })
}

export const setTestsTimeout = (timeout) => {
  let originalTimeout

  beforeEach(() => {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
    jasmine.DEFAULT_TIMEOUT_INTERVAL = timeout
  })

  afterEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout
  })
}
