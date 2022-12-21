/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.table("purchases", (table) => {
    table.string("source").notNullable().defaultTo("github");
  });

  await knex.raw("ALTER TABLE purchases ALTER COLUMN source DROP DEFAULT");

  await knex.schema.table("accounts", (table) => {
    table.string("stripeCustomerId");
  });

  await knex.schema.table("plans", (table) => {
    table.string("stripePlanId");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.table("purchases", (table) => {
    table.dropColumn("source");
  });

  await knex.schema.table("accounts", (table) => {
    table.dropColumn("stripeCustomerId");
  });

  await knex.schema.table("plans", (table) => {
    table.dropColumn("stripePlanId");
  });
};
