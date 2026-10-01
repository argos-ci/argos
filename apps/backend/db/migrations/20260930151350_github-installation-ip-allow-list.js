/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("github_installations", (table) => {
    table.dateTime("ipAllowListBlockedAt").nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("github_installations", (table) => {
    table.dropColumn("ipAllowListBlockedAt");
  });
};
