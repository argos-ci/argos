/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("build_reviews", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("userId").index();
    table.foreign("userId").references("users.id");
    table.bigInteger("buildId").index().notNullable();
    table.foreign("buildId").references("builds.id");
    table.enum("state", ["pending", "approved", "rejected"]).notNullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("build_reviews");
};
