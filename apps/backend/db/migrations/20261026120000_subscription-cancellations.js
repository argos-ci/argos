/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("subscriptions", (table) => {
    // Mirrored from Stripe's `canceled_at` and `cancellation_details`, which
    // were only read on the way to a Discord alert and lost after it.
    table.dateTime("canceledAt");
    table.string("cancellationReason");
    table.string("cancellationFeedback");
    table.text("cancellationComment");
  });

  await knex.schema.createTable("staff_cancellation_contacts", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("subscriptionId").unsigned().notNullable();
    table
      .foreign("subscriptionId")
      .references("subscriptions.id")
      .onDelete("cascade");
    table.bigInteger("userId").unsigned().notNullable();
    table.foreign("userId").references("users.id").onDelete("cascade");

    // Keyed on the subscription rather than the team: a team that comes back
    // and cancels again is a new conversation.
    table.unique("subscriptionId");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("staff_cancellation_contacts");
  await knex.schema.alterTable("subscriptions", (table) => {
    table.dropColumn("canceledAt");
    table.dropColumn("cancellationReason");
    table.dropColumn("cancellationFeedback");
    table.dropColumn("cancellationComment");
  });
};
