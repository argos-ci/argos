/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("gitlab_users", async (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("name").notNullable();
    table.string("email").notNullable();
    table.string("username").notNullable();
    table.integer("gitlabId").unsigned().notNullable();
    table.string("accessToken").notNullable();
    table.dateTime("accessTokenExpiresAt").notNullable();
    table.string("refreshToken").notNullable();
  });

  await knex.schema.alterTable("users", async (table) => {
    table.bigInteger("gitlabUserId");
    table.foreign("gitlabUserId").references("gitlab_users.id");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("users", async (table) => {
    table.dropColumn("gitlabUserId");
  });

  await knex.schema.dropTable("gitlab_users");
};
