/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable(
    "comment_notifications_subscriptions",
    (table) => {
      table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
      table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());

      table.bigInteger("commentId").notNullable();
      table.foreign("commentId").references("comments.id").onDelete("CASCADE");

      table.bigInteger("userId").notNullable();
      table.foreign("userId").references("users.id").onDelete("CASCADE");

      table.dateTime("subscribedAt");
      table.dateTime("unsubscribedAt");

      table.primary(["commentId", "userId"]);

      table.index("userId");
    },
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("comment_notifications_subscriptions");
};
