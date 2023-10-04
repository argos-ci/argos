/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("synchronizations", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("userId").notNullable().index();
    table.foreign("userId").references("users.id");
    table.string("jobStatus").notNullable().index();
    table.string("type").notNullable().index();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("synchronizations");
};
