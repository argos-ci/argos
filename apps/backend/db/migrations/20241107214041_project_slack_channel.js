/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("projects", async (table) => {
    table.string("slackChannelId");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("projects", async (table) => {
    table.dropColumn("slackChannelId");
  });
};
