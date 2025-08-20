/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("slack_channels", (table) => {
    table.boolean("archived").notNullable().defaultTo(false);
  });

  await knex.schema.alterTable("automation_runs", (table) => {
    table.dropColumn("jobStatus");
  });

  await knex.raw(
    `update automation_actions_runs set "processedAt" = "completedAt"`,
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("slack_channels", (table) => {
    table.boolean("archived").notNullable().defaultTo(false);
  });

  await knex.schema.alterTable("automation_runs", (table) => {
    table.string("jobStatus").notNullable().defaultTo("pending");
  });
};
