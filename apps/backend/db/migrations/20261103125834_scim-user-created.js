/**
 * Whether SCIM created the Argos account it points to, rather than linking one
 * that already existed. Only an account the team's IdP created may be signed in
 * to through that IdP without the person proving they own it first.
 *
 * Existing rows are backfilled from timestamps: `createScimUser` creates the
 * account moments before inserting the row, while a linked account predates it.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("team_scim_users", (table) => {
    table.boolean("userCreated").notNullable().defaultTo(false);
  });
  await knex.raw(`
    UPDATE team_scim_users
    SET "userCreated" = true
    FROM users
    WHERE users.id = team_scim_users."userId"
      AND users."createdAt" BETWEEN team_scim_users."createdAt" - interval '1 minute'
        AND team_scim_users."createdAt"
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("team_scim_users", (table) => {
    table.dropColumn("userCreated");
  });
};
