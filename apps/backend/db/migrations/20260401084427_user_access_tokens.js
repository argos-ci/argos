/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("user_access_tokens", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("userId").notNullable().index();
    table.foreign("userId").references("users.id");
    table.string("name").notNullable();
    table.string("token").notNullable().unique();
    table.dateTime("expireAt").nullable();
    table.dateTime("lastUsedAt").nullable();
    table.string("createdBy").notNullable();
  });

  await knex.schema.createTable("user_access_token_scopes", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("userAccessTokenId").notNullable().index();
    table.foreign("userAccessTokenId").references("user_access_tokens.id");
    table.bigInteger("accountId").notNullable().index();
    table.foreign("accountId").references("accounts.id");
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
