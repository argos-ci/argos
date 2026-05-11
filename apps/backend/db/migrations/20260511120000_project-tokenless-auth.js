/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("projects", (table) => {
    table.boolean("tokenlessAuthEnabled").notNullable().defaultTo(false);
  });

  // Backfill existing projects to keep them working — they may already rely
  // on tokenless authentication. New projects opt in explicitly.
  await knex("projects").update({ tokenlessAuthEnabled: true });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("tokenlessAuthEnabled");
  });
};
