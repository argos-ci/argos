const TABLES = ["user_access_token_scopes", "oauth_grant_accounts"];

/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  for (const table of TABLES) {
    await knex.schema.alterTable(table, (t) => {
      t.boolean("samlAuthorized").notNullable().defaultTo(false);
    });

    // Tokens issued before tokens had to come from a SAML session keep working
    // on the teams that enforce SAML today. A team that turns enforcement on
    // later gets the new rule for every token, like it does for sessions.
    await knex.raw(`
      UPDATE ${table}
      SET "samlAuthorized" = true
      FROM team_saml_configs
      WHERE team_saml_configs."accountId" = ${table}."accountId"
        AND team_saml_configs.enforced
    `);
  }
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  for (const table of TABLES) {
    await knex.schema.alterTable(table, (t) => {
      t.dropColumn("samlAuthorized");
    });
  }
};
