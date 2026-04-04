/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("user_access_tokens", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("userId").notNullable().index();
    table.foreign("userId").references("users.id").onDelete("cascade");
    table.string("name").notNullable();
    table.string("token", 64).notNullable().unique();
    table.dateTime("expireAt").nullable();
    table.dateTime("lastUsedAt").nullable();
    table.enum("source", ["user", "cli"]).notNullable();
  });

  await knex.schema.createTable("user_access_token_scopes", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("userAccessTokenId").notNullable();
    table
      .foreign("userAccessTokenId")
      .references("user_access_tokens.id")
      .onDelete("cascade");
    table.bigInteger("accountId").notNullable();
    table.foreign("accountId").references("accounts.id").onDelete("cascade");
    table.unique(["userAccessTokenId", "accountId"]);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("user_access_token_scopes");
  await knex.schema.dropTable("user_access_tokens");
};
