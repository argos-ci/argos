/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("slack_installations", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("teamId").unique().notNullable();
    table.string("teamName").notNullable();
    table.string("teamDomain").unique().notNullable();
    table.jsonb("installation").notNullable();
  });

  await knex.schema.alterTable("accounts", (table) => {
    table
      .bigInteger("slackInstallationId")
      .references("slack_installations.id")
      .unique();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("accounts", (table) => {
    table.dropColumn("slackInstallationId");
  });
  await knex.schema.dropTable("slack_installations");
};
