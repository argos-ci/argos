/* eslint-disable no-console */
/* global jasmine */
import * as allServices from 'server/services/all'
import * as database from 'server/services/database'

const KNEX_TABLES = ['knex_migrations', 'knex_migrations_lock']

let truncateQuery
async function getTruncateQuery(knex) {
  if (!truncateQuery) {
    const result = await knex.schema.raw(
      'SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\'',
    )

    const tables = result.rows.reduce((tables, { tablename }) => (
      KNEX_TABLES.includes(tablename) ? tables : [...tables, tablename]
    ), [])

    const disableTriggers = tables.map(table => `ALTER TABLE ${table} DISABLE TRIGGER ALL`)
    const deletes = tables.map(table => `DELETE FROM ${table}`)
    const enableTriggers = tables.map(table => `ALTER TABLE ${table} ENABLE TRIGGER ALL`)
    truncateQuery = [...disableTriggers, ...deletes, ...enableTriggers].join(';')
  }

  return truncateQuery
}

export async function truncateAll(knex) {
  const query = await getTruncateQuery(knex)
  return knex.schema.raw(query)
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
