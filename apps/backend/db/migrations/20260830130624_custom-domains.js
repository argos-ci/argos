/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("project_domains", (table) => {
    table.text("status").notNullable().defaultTo("active");
    table.text("cloudfrontTenantId").unique();
    table.text("routingEndpoint");
    table.text("statusReason");
    table.dateTime("activatedAt");
    table.dateTime("lastCheckedAt");
  });

  await knex.raw(`
    ALTER TABLE project_domains
    ADD CONSTRAINT project_domains_status_check
    CHECK ("status" = ANY (ARRAY['pending'::text, 'active'::text, 'failed'::text]))
  `);

  // An internal domain is covered by the wildcard certificate and has no
  // CloudFront tenant of its own, so it is never anything but active.
  await knex.raw(`
    ALTER TABLE project_domains
    ADD CONSTRAINT project_domains_internal_status_check
    CHECK (
      "internal" = false
      OR ("status" = 'active' AND "cloudfrontTenantId" IS NULL)
    )
  `);

  // Only active domains are served, so this is the index the alias assignment
  // and the re-check cron both read.
  await knex.raw(`
    CREATE INDEX project_domains_pending_index
    ON project_domains ("lastCheckedAt")
    WHERE "status" = 'pending'
  `);

  await knex.schema.alterTable("plans", (table) => {
    table.boolean("customDomainsIncluded").notNullable().defaultTo(false);
  });

  await knex("plans").whereNot({ name: "free" }).update({
    customDomainsIncluded: true,
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("plans", (table) => {
    table.dropColumn("customDomainsIncluded");
  });

  await knex.raw(`DROP INDEX IF EXISTS project_domains_pending_index`);

  await knex.schema.alterTable("project_domains", (table) => {
    table.dropColumn("status");
    table.dropColumn("cloudfrontTenantId");
    table.dropColumn("routingEndpoint");
    table.dropColumn("statusReason");
    table.dropColumn("activatedAt");
    table.dropColumn("lastCheckedAt");
  });
};
