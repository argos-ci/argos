/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("deployment_notifications", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("deploymentId").unsigned().notNullable().index();
    table
      .foreign("deploymentId")
      .references("deployments.id")
      .onDelete("cascade");
    table.enum("type", ["progress", "success"]).notNullable();
    table.specificType("jobStatus", "job_status").notNullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("deployment_notifications");
};
