/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("user_sessions", (table) => {
    table.enum("authMethod", [
      "email",
      "google",
      "github",
      "gitlab",
      "saml",
      "passkey",
    ]);
    table.bigInteger("samlTeamId");
    table.foreign("samlTeamId").references("teams.id").onDelete("SET NULL");
  });

  await knex.raw(`
    ALTER TABLE user_sessions
    ADD CONSTRAINT "user_sessions_samlTeamId_check"
    CHECK ("samlTeamId" IS NULL OR "authMethod" = 'saml')
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("user_sessions", (table) => {
    table.dropColumn("samlTeamId");
    table.dropColumn("authMethod");
  });
};
