/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("notification_workflows", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.specificType("jobStatus", "job_status").notNullable();
    table.string("type").notNullable();
    table.jsonb("data").notNullable();
  });

  await knex.schema.createTable("notification_workflow_recipients", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("userId").index().notNullable();
    table.foreign("userId").references("users.id");
    table.bigInteger("workflowId").index().notNullable();
    table.foreign("workflowId").references("notification_workflows.id");
  });

  await knex.schema.createTable("notification_messages", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.specificType("jobStatus", "job_status").notNullable();
    table.bigInteger("userId").index().notNullable();
    table.foreign("userId").references("users.id");
    table.bigInteger("workflowId").index().notNullable();
    table.foreign("workflowId").references("notification_workflows.id");
    table.string("channel").notNullable();
    table.dateTime("sentAt");
    table.dateTime("deliveredAt");
    table.dateTime("linkClickedAt");
    table.string("externalId").index();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("notification_messages");
  await knex.schema.dropTable("notification_workflow_recipients");
  await knex.schema.dropTable("notification_workflows");
};
