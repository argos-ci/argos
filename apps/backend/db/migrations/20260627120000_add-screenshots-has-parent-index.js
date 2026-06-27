/**
 * Partial index supporting the anti-join in `queryActiveTests`
 * (apps/backend/src/graphql/services/test.ts). The team "Tests" dashboard used
 * to hash-join the whole `screenshots` table (300M+ rows) just to keep the
 * screenshots with a null `parentName`. Since ~99.6% of screenshots have a null
 * `parentName`, we instead exclude the rare child screenshots via an anti-join;
 * this index makes that anti-join cheap (it only holds the ~0.4% of rows that
 * have a `parentName`).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.raw(`
    create index concurrently if not exists
      screenshots_id_has_parent_idx
    on screenshots ("id")
    where "parentName" is not null;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.raw(`
    drop index concurrently if exists screenshots_id_has_parent_idx;
  `);
};

export const config = { transaction: false };
