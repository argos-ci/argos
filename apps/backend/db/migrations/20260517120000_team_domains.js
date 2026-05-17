/**
 * @param {import("knex").Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("team_domains", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("teamId").unsigned().notNullable();
    table.string("domain").notNullable().index();
    table.foreign("teamId").references("teams.id").onDelete("cascade");
    table.unique(["teamId", "domain"]);
  });
};

/**
 * @param {import("knex").Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("team_domains");
};
