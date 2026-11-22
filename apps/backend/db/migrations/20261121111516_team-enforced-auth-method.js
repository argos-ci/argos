const SESSION_AUTH_METHODS = [
  "email",
  "google",
  "github",
  "gitlab",
  "saml",
  "passkey",
];

const SCOPE_TABLES = ["user_access_token_scopes", "oauth_grant_accounts"];

/**
 * `team_saml_configs.enforced` and the scopes' `samlAuthorized` are left in
 * place: tasks still running the previous release read them until the deploy
 * finishes. They are dropped in a later migration.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("google_users", (table) => {
    // The Google Workspace domain of the account (the ID token's `hd` claim),
    // which a consumer account on a work address does not have.
    table.string("hostedDomain");
  });
  await knex.schema.alterTable("teams", (table) => {
    table.enum("enforcedAuthMethod", ["google", "github", "saml"]);
  });
  await knex.raw(`
    UPDATE teams
    SET "enforcedAuthMethod" = 'saml'
    FROM accounts
    JOIN team_saml_configs ON team_saml_configs."accountId" = accounts.id
    WHERE accounts."teamId" = teams.id
    AND team_saml_configs.enforced
  `);

  for (const tableName of SCOPE_TABLES) {
    await knex.schema.alterTable(tableName, (table) => {
      table.enum("authMethod", SESSION_AUTH_METHODS);
    });
    await knex(tableName)
      .where("samlAuthorized", true)
      .update({ authMethod: "saml" });
  }
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  for (const tableName of SCOPE_TABLES) {
    await knex.schema.alterTable(tableName, (table) => {
      table.dropColumn("authMethod");
    });
  }
  await knex.schema.alterTable("teams", (table) => {
    table.dropColumn("enforcedAuthMethod");
  });
  await knex.schema.alterTable("google_users", (table) => {
    table.dropColumn("hostedDomain");
  });
};
