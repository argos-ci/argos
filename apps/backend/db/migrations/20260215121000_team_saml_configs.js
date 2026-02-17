/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("team_saml_configs", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());
    table.bigInteger("accountId").notNullable().unique();
    table.foreign("accountId").references("accounts.id").onDelete("CASCADE");

    table.string("idpEntityId").notNullable();
    table.string("ssoUrl").notNullable();
    table.text("signingCertificate").notNullable();

    table.boolean("enabled").notNullable().defaultTo(false);
    table.boolean("enforced").notNullable().defaultTo(false);
  });

  await knex.schema.alterTable("plans", (table) => {
    table.boolean("samlIncluded").notNullable().defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("plans", (table) => {
    table.dropColumn("samlIncluded");
  });
  await knex.schema.dropTable("team_saml_configs");
};
