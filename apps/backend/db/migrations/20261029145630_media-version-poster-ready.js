/**
 * When the image CDN first served a video's poster frame as a real image. Until
 * then nothing embeds the poster: ImageKit answers a frame it has not extracted
 * yet with a `202` HTML page, which renders as a broken image in a pull request
 * and collapses the share page's player.
 *
 * Videos uploaded before the poster sweep's 7-day window are marked ready: the
 * sweep would never look at them again, and their posters have been served for
 * as long as they have existed. The recent ones are left for the sweep to check.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("media_versions", (table) => {
    table.dateTime("posterReadyAt");
  });

  await knex.raw(`
    UPDATE media_versions
    SET "posterReadyAt" = "uploadedAt"
    WHERE "mimeType" LIKE 'video/%'
      AND "uploadedAt" < now() - interval '7 days'
  `);

  await knex.raw(`
    CREATE INDEX media_versions_poster_pending_idx
    ON media_versions ("uploadedAt")
    WHERE "posterReadyAt" IS NULL AND "mimeType" LIKE 'video/%'
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`DROP INDEX media_versions_poster_pending_idx`);
  await knex.schema.alterTable("media_versions", (table) => {
    table.dropColumn("posterReadyAt");
  });
};
