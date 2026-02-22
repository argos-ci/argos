/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("team_saml_configs", (table) => {
    table.dateTime("expirationCheckAt");
  });

  await knex("team_saml_configs").update({
    expirationCheckAt: knex.fn.now(),
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("team_saml_configs", (table) => {
    table.dropColumn("expirationCheckAt");
  });
};
