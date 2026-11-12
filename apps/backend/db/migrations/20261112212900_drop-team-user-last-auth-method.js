/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("team_users", (table) => {
    table.dropColumn("lastAuthMethod");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("team_users", (table) => {
    table.enum("lastAuthMethod", [
      "email",
      "google",
      "github",
      "gitlab",
      "saml",
      "passkey",
    ]);
  });
};
