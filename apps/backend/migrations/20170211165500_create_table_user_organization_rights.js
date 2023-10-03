/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("user_organization_rights", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("userId").notNullable().index();
    table.foreign("userId").references("users.id");
    table.bigInteger("organizationId").notNullable().index();
    table.foreign("organizationId").references("organizations.id");
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.unique(["userId", "organizationId"]);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("user_organization_rights");
};
