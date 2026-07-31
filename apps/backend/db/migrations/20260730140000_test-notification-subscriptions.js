/**
 * Per-test notification subscriptions, mirroring
 * `build_notification_subscriptions`: a user follows a test to hear about its
 * new comments. Both dates are kept so an intentional unsubscription can be
 * told apart from "never subscribed", which is what stops the auto-subscribe on
 * comment from re-subscribing someone who opted out.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("test_notification_subscriptions", (table) => {
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());

    table.bigInteger("testId").notNullable();
    table.foreign("testId").references("tests.id").onDelete("CASCADE");

    table.bigInteger("userId").notNullable();
    table.foreign("userId").references("users.id").onDelete("CASCADE");

    table.dateTime("subscribedAt");
    table.dateTime("unsubscribedAt");

    table.primary(["testId", "userId"]);

    table.index("userId");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("test_notification_subscriptions");
};
