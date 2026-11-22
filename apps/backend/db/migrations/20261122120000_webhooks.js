/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("webhooks", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("accountId").unsigned().notNullable().index();
    table.foreign("accountId").references("accounts.id").onDelete("cascade");
    // Encrypted at rest: endpoints often carry their own credential in the
    // path or the query string.
    table.text("url").notNullable();
    // Encrypted at rest, not hashed: every request is signed with it.
    table.text("secret").notNullable();
    table.jsonb("events").notNullable();
    // When false, the webhook only receives events from the projects linked
    // in `webhook_projects`, which may end up empty once they are deleted.
    table.boolean("allProjects").notNullable();
  });

  await knex.schema.createTable("webhook_projects", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("webhookId").unsigned().notNullable();
    table.foreign("webhookId").references("webhooks.id").onDelete("cascade");
    table.bigInteger("projectId").unsigned().notNullable().index();
    table.foreign("projectId").references("projects.id").onDelete("cascade");
    table.unique(["webhookId", "projectId"]);
  });

  await knex.schema.createTable("project_events", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable().index();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("projectId").unsigned().notNullable();
    table.foreign("projectId").references("projects.id").onDelete("cascade");
    table.string("name").notNullable();
    // `json` rather than `jsonb`: it keeps the payload as written, key order
    // included, so a delivered body reads the way it is documented.
    table.json("data").notNullable();
    // The feed reads a project's events in id order.
    table.index(["projectId", "id"]);
  });

  await knex.schema.createTable("webhook_deliveries", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("webhookId").unsigned().notNullable();
    table.foreign("webhookId").references("webhooks.id").onDelete("cascade");
    table.bigInteger("eventId").unsigned().notNullable().index();
    table
      .foreign("eventId")
      .references("project_events.id")
      .onDelete("cascade");
    table.specificType("jobStatus", "job_status").notNullable();
    table.integer("attempts").notNullable().defaultTo(0);
    table.enum("conclusion", ["success", "failed"]);
    // From the latest attempt, also filled while retries are pending.
    table.dateTime("attemptedAt");
    table.integer("responseStatus");
    table.integer("durationMs");
    // The start of the response body, for whoever looks into a failure.
    table.text("responseBody");
    table.text("failureReason");
    table.index(["webhookId", "id"]);
  });

  // What `requeueStalledWebhookDeliveries` scans: only the deliveries no job
  // has picked up yet, a handful among all those kept.
  await knex.raw(
    `CREATE INDEX webhook_deliveries_pending_createdat_index ON webhook_deliveries ("createdAt") WHERE "jobStatus" = 'pending'`,
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("webhook_deliveries");
  await knex.schema.dropTable("project_events");
  await knex.schema.dropTable("webhook_projects");
  await knex.schema.dropTable("webhooks");
};
