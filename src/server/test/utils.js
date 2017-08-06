/* global jasmine */

import * as services from 'server/services/all'
import * as database from 'server/services/database'

const KNEX_TABLES = ['knex_migrations', 'knex_migrations_lock']

let truncateQuery
async function getTruncateQuery(knex) {
  if (!truncateQuery) {
    const result = await knex.raw(
      "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"
    )

    const tables = result.rows.reduce(
      (tablesAcc, { tablename }) =>
        KNEX_TABLES.includes(tablename) ? tablesAcc : [...tablesAcc, tablename],
      []
    )

    const disableTriggers = tables.map(table => `ALTER TABLE ${table} DISABLE TRIGGER ALL`)
    const deletes = tables.map(table => `DELETE FROM ${table}`)
    const enableTriggers = tables.map(table => `ALTER TABLE ${table} ENABLE TRIGGER ALL`)
    truncateQuery = [...disableTriggers, ...deletes, ...enableTriggers].join(';')
  }

  return truncateQuery
}

export async function truncateAll(knex) {
  const query = await getTruncateQuery(knex)
  return knex.raw(query)
}

export const useDatabase = () => {
  let knex

  beforeAll(() => {
    knex = database.connect('test')
  })

  beforeEach(async () => {
    await truncateAll(knex)
  })

  afterAll(async () => {
    await services.disconnect()
  })
}

export const setTestsTimeout = timeout => {
  let originalTimeout

  beforeEach(() => {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
    jasmine.DEFAULT_TIMEOUT_INTERVAL = timeout
  })

  afterEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout
  })
}

export function noGraphqlError(res) {
  if (res.body.errors !== undefined) {
    expect(res.body.errors).toEqual([])
  }
}
