/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("purchases", (table) => {
    table.string("source").notNullable().defaultTo("github");
    table.bigInteger("purchaserId");
    table.foreign("purchaserId").references("users.id");
  });

  await knex.raw("ALTER TABLE purchases ALTER COLUMN source DROP DEFAULT");

  await knex.schema.alterTable("accounts", (table) => {
    table.string("stripeCustomerId");
  });

  await knex.schema.alterTable("plans", (table) => {
    table.string("stripePlanId");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("purchases", (table) => {
    table.dropColumn("source");
  });

  await knex.schema.alterTable("accounts", (table) => {
    table.dropColumn("stripeCustomerId");
  });

  await knex.schema.alterTable("plans", (table) => {
    table.dropColumn("stripePlanId");
  });
};
