/**
 * @param {import('knex')} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("user_repository_rights", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("userId").notNullable().index();
    table.foreign("userId").references("users.id");
    table.bigInteger("repositoryId").notNullable().index();
    table.foreign("repositoryId").references("repositories.id");
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.unique(["userId", "repositoryId"]);
  });
};

/**
 * @param {import('knex')} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("user_repository_rights");
};
