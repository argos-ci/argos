/**
 * @param {import('knex')} knex
 */
export const up = async (knex) => {
  await knex.raw(
    `create index concurrently if not exists screenshots_createdAt on screenshots ("createdAt" desc);`
  );
  await knex.raw(
    `create index concurrently if not exists repositories_private on repositories ("private");`
  );
};

/**
 * @param {import('knex')} knex
 */
export const down = async (knex) => {
  await knex.raw(`
    drop index screenshots_createdAt;
    drop index repositories_private;
  `);
};

export const config = { transaction: false };
