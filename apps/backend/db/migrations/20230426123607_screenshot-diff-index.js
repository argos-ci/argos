/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.raw(`
  CREATE INDEX if not exists screenshot_diffs_test_id_id_desc_idx ON screenshot_diffs ("testId", id DESC);
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.raw(`
  DROP INDEX if exists screenshot_diffs_test_id_id_desc_idx;
  `);
};
