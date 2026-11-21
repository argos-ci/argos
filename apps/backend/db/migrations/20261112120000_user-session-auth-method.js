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

  // Until now, a session satisfied a team's SAML enforcement whenever the
  // user's membership in that team was marked "saml". Live sessions keep that
  // verdict, so the deploy signs nobody out. A session holds one team: a user
  // marked "saml" in several keeps one that enforces SAML.
  await knex.raw(`
    UPDATE user_sessions
    SET "authMethod" = 'saml', "samlTeamId" = marked."teamId"
    FROM (
      SELECT DISTINCT ON (team_users."userId")
        team_users."userId",
        team_users."teamId"
      FROM team_users
      JOIN accounts ON accounts."teamId" = team_users."teamId"
      LEFT JOIN team_saml_configs
        ON team_saml_configs."accountId" = accounts.id
      WHERE team_users."lastAuthMethod" = 'saml'
      ORDER BY
        team_users."userId",
        team_saml_configs.enforced IS TRUE DESC,
        team_users."teamId"
    ) AS marked
    WHERE user_sessions."userId" = marked."userId"
      AND user_sessions."revokedAt" IS NULL
      AND user_sessions."expiresAt" > now()
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
