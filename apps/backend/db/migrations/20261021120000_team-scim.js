/**
 * SCIM provisioning: the token a team's Identity Provider authenticates with,
 * and the users it provisioned. A provisioned user outlives its team
 * membership — the IdP deactivates before it deletes, and reactivates by the
 * same id — so it is a table of its own rather than columns on `team_users`.
 *
 * @param {import("knex").Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("team_scim_tokens", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("teamId").unsigned().notNullable().unique();
    table.string("tokenHash", 64).notNullable().unique();
    table.dateTime("lastUsedAt");
    table.foreign("teamId").references("teams.id").onDelete("cascade");
  });

  await knex.schema.createTable("team_scim_users", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("teamId").unsigned().notNullable();
    table.bigInteger("userId").unsigned().notNullable().index();
    table.string("userName").notNullable();
    table.string("externalId");
    table.string("email");
    table.string("displayName");
    table.string("givenName");
    table.string("familyName");
    table.boolean("active").notNullable().defaultTo(true);
    table.enum("role", ["owner", "member", "contributor"]);
    table.foreign("teamId").references("teams.id").onDelete("cascade");
    table.foreign("userId").references("users.id").onDelete("cascade");
    table.unique(["teamId", "userId"]);
  });

  // SCIM compares `userName` case-insensitively (RFC 7643 §4.1.1).
  await knex.raw(
    `CREATE UNIQUE INDEX team_scim_users_teamid_lower_username_unique ON team_scim_users ("teamId", lower("userName"))`,
  );
};

/**
 * @param {import("knex").Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("team_scim_users");
  await knex.schema.dropTable("team_scim_tokens");
};
