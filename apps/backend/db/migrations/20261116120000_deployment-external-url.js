/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  await knex.schema.alterTable("deployments", (table) => {
    table.text("externalUrl");
  });

  await knex.raw(`
    ALTER TABLE deployments ALTER COLUMN slug DROP NOT NULL
  `);

  // A deployment is either served by Argos from its slug, or hosted elsewhere
  // and only known by its URL.
  await knex.raw(`
    ALTER TABLE deployments
    ADD CONSTRAINT "deployments_slug_externalUrl_check"
    CHECK ((slug IS NULL) <> ("externalUrl" IS NULL))
  `);
}

/**
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
  await knex.raw(`DELETE FROM deployments WHERE slug IS NULL`);

  await knex.raw(`
    ALTER TABLE deployments
    DROP CONSTRAINT "deployments_slug_externalUrl_check"
  `);

  await knex.raw(`
    ALTER TABLE deployments ALTER COLUMN slug SET NOT NULL
  `);

  await knex.schema.alterTable("deployments", (table) => {
    table.dropColumn("externalUrl");
  });
}
