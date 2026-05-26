/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("build_notification_subscriptions", (table) => {
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());

    table.bigInteger("buildId").notNullable();
    table.foreign("buildId").references("builds.id").onDelete("CASCADE");

    table.bigInteger("userId").notNullable();
    table.foreign("userId").references("users.id").onDelete("CASCADE");

    table.dateTime("subscribedAt");
    table.dateTime("unsubscribedAt");

    table.primary(["buildId", "userId"]);

    table.index("userId");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("build_notification_subscriptions");
};
