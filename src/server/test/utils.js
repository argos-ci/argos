/* eslint-disable no-console */
/* global jasmine */
import * as allServices from 'server/services/all'
import * as database from 'server/services/database'

const KNEX_TABLES = ['knex_migrations', 'knex_migrations_lock']

let truncateQuery
async function getTruncateQuery(knex) {
  if (truncateQuery) {
    return truncateQuery
  }

  const result = await knex.schema.raw(
    'SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\'',
  )

  const tables = result.rows.reduce((tables, { tablename }) => (
    KNEX_TABLES.includes(tablename) ? tables : [...tables, tablename]
  ), [])

  return `TRUNCATE ${tables.join(',')} CASCADE`
}

export async function truncateAll(knex) {
  return knex.schema.raw(await getTruncateQuery(knex))
}

export const useDatabase = () => {
  let knex

  beforeAll(() => {
    knex = database.connect('test')
  })

  afterAll(async () => {
    await allServices.disconnect()
  })

  beforeEach(async () => {
    await truncateAll(knex)
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
