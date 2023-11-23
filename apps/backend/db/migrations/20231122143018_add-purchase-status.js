/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("purchases", (table) => {
    table.string("status");
  });

  await knex("purchases").update({
    status: knex.raw(`CASE
          WHEN status IS NULL AND "endDate" IS NOT NULL AND "endDate" < NOW() THEN 'canceled'
          WHEN status IS NULL AND "endDate" IS NULL AND "trialEndDate" IS NOT NULL AND "trialEndDate" > NOW() THEN 'trialing'
          WHEN status IS NULL THEN 'active'
          ELSE status
          END`),
  });

  await knex.schema.alterTable("purchases", (table) => {
    table.string("status").notNullable().alter();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("purchases", (table) => {
    table.dropColumn("status");
  });
};
