/**
 * When the account's administrators were emailed that the token is about to
 * expire. Set once, by the conditional update that claims the warning, so two
 * runs of the job never send it twice.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("project_tokens", (table) => {
    table.dateTime("expiryWarnedAt");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("project_tokens", (table) => {
    table.dropColumn("expiryWarnedAt");
  });
};
