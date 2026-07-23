/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("staff_team_contacts", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("teamId").unsigned().notNullable();
    table.foreign("teamId").references("teams.id").onDelete("cascade");
    table.bigInteger("userId").unsigned().notNullable();
    table.foreign("userId").references("users.id").onDelete("cascade");

    // One contact per team: this records that the onboarding reach-out
    // happened, and who made it.
    table.unique("teamId");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("staff_team_contacts");
};
