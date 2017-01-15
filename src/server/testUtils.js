/* eslint-disable no-console */
import { connect, disconnect } from 'server/database';


const KNEX_TABLES = ['knex_migrations', 'knex_migrations_lock'];

async function truncateAll(knex) {
  const result = await knex.schema.raw(
    'SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\'',
  );

  const tables = result.rows.reduce((tables, { tablename }) => (
    KNEX_TABLES.includes(tablename) ? tables : [...tables, tablename]
  ), []);

  return await knex.schema.raw(`TRUNCATE ${tables.join(',')} CASCADE`);
}

export const useDatabase = () => {
  let knex;

  beforeEach(async function () {
    knex = connect('test');
    await knex.migrate.latest();
  });

  afterEach(async function () {
    await truncateAll(knex);
    await disconnect(knex);
  });
};
