/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("team_invites", (table) => {
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("expiresAt").notNullable();
    table.string("secret", 20).notNullable().index();
    table.bigInteger("teamId").notNullable();
    table.foreign("teamId").references("teams.id");
    table.string("email").notNullable().index();
    table.enum("userLevel", ["owner", "member", "contributor"]).notNullable();
    table.primary(["teamId", "email"]);
    table.unique(["secret"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTable("team_invites");
};
