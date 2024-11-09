/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("slack_channels", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("name").notNullable();
    table.string("slackId").notNullable();

    table.bigInteger("slackInstallationId").notNullable();
    table.foreign("slackInstallationId").references("slack_installations.id");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("slack_channels");
};
