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
    // When a staff member wrote to the team about its cancellation.
    table.dateTime("staffContactedAt");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("subscriptions", (table) => {
    table.dropColumn("canceledAt");
    table.dropColumn("cancellationReason");
    table.dropColumn("cancellationFeedback");
    table.dropColumn("cancellationComment");
    table.dropColumn("staffContactedAt");
  });
};
