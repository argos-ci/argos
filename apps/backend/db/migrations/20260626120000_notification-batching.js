/**
 * Durable batching layer for review/comment email notifications.
 *
 * `notification_batches` is an outbox/digest table: review activity on a build
 * accumulates into one open batch per recipient until `deliverAfter` is due, at
 * which point a digest email is sent. `notification_batch_items` links each
 * batched workflow recipient to its batch (one row per recipient, idempotent).
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  // Workflows opt into batching by carrying a batch key (e.g. `build:42`).
  await knex.schema.alterTable("notification_workflows", (table) => {
    table.string("batchKey");
  });

  await knex.schema.createTable("notification_batches", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());
    // Tracks the flush job lifecycle once the batch is closed and queued.
    table
      .specificType("jobStatus", "job_status")
      .notNullable()
      .defaultTo(knex.raw("'pending'::job_status"));

    table.bigInteger("userId").notNullable();
    table.foreign("userId").references("users.id").onDelete("CASCADE");

    table.string("channel").notNullable();
    table.string("category").notNullable();
    table.string("batchKind").notNullable();
    table.string("batchKey").notNullable();

    table.dateTime("firstEventAt").notNullable();
    table.dateTime("lastEventAt").notNullable();
    // When the batch becomes due. Debounced on each new event but never pushed
    // past `maxDeliverAfter`.
    table.dateTime("deliverAfter").notNullable();
    table.dateTime("maxDeliverAfter").notNullable();
    // Set when the cron closes the batch for delivery; null while open.
    table.dateTime("closedAt");

    table.bigInteger("digestWorkflowId");
    table
      .foreign("digestWorkflowId")
      .references("notification_workflows.id")
      .onDelete("SET NULL");
  });

  // Find due open batches quickly.
  await knex.raw(`
    CREATE INDEX notification_batches_due_idx
    ON notification_batches ("deliverAfter")
    WHERE "closedAt" IS NULL
  `);

  // At most one open batch per recipient/scope.
  await knex.raw(`
    CREATE UNIQUE INDEX notification_batches_open_unique
    ON notification_batches ("userId", "channel", "batchKind", "batchKey")
    WHERE "closedAt" IS NULL
  `);

  await knex.schema.createTable("notification_batch_items", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());

    table.bigInteger("batchId").notNullable();
    table
      .foreign("batchId")
      .references("notification_batches.id")
      .onDelete("CASCADE");

    // One row per workflow recipient: unique so a retried workflow job that
    // partially inserted items stays idempotent.
    table.bigInteger("workflowRecipientId").notNullable().unique();
    table
      .foreign("workflowRecipientId")
      .references("notification_workflow_recipients.id")
      .onDelete("CASCADE");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("notification_batch_items");
  await knex.schema.dropTableIfExists("notification_batches");
  await knex.schema.alterTable("notification_workflows", (table) => {
    table.dropColumn("batchKey");
  });
};
