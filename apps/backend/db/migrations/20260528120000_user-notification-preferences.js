/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("user_notification_preferences", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());

    table.bigInteger("userId").notNullable();
    table.foreign("userId").references("users.id").onDelete("CASCADE");

    table.string("category").notNullable();
    table.string("channel").notNullable();
    table.boolean("enabled").notNullable();

    table.unique(["userId", "category", "channel"]);
    table.index("userId");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("user_notification_preferences");
};
