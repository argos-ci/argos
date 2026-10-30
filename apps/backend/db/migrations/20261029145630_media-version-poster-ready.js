/**
 * When the image CDN first served a video's poster frame as an image. Until
 * then the poster is served through Argos, which stands in for a frame the CDN
 * has not extracted yet. Existing videos start unset and are marked the first
 * time their poster is asked for.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("media_versions", (table) => {
    table.dateTime("posterReadyAt");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("media_versions", (table) => {
    table.dropColumn("posterReadyAt");
  });
};
