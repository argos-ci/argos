/**
 * `baseName` used to hold a single baseline name override. It is superseded by
 * `baseNames`, an ordered list of candidate baseline names. The legacy column is
 * kept so that already-uploaded screenshots (which are read back as baselines
 * for weeks) keep resolving; new rows only write `baseNames`.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("screenshots", (table) => {
    table.jsonb("baseNames");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("screenshots", (table) => {
    table.dropColumn("baseNames");
  });
};
