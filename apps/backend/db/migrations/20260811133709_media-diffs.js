/**
 * The pixel diff between the two halves of a before/after media pair.
 *
 * A reviewer looking at "before" and "after" side by side is doing by eye what
 * Argos already does for builds: finding the pixels that moved. This table is
 * that answer, computed with the same diff engine (odiff) in a background job.
 *
 * Keyed on the two **versions** it was computed from, not on the two media, and
 * that is the whole point of the table. Re-uploading either half is a new
 * version, so it is a new pair, so it is a new row — the diff carries where it
 * came from and can never be shown against bytes it was not computed from.
 * Nothing is ever recomputed in place, which also means the mask a reviewer is
 * looking at cannot change under them while a job runs.
 *
 * `key` is the diff mask: a PNG whose opaque pixels are the ones that differ,
 * exactly like `screenshot_diffs.s3Id`. It is null when the two halves are
 * identical (`score` 0) — there is no mask to draw — and while the job has not
 * run yet, which `jobStatus` tells apart.
 *
 * Deliberately not a `files` row: media never joins that table. Its versions
 * carry a plain content-addressed key served through the image CDN, and the
 * `files` machinery around it (fingerprints, ignored changes, test stats) is
 * build-only.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("media_diffs", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();

    // The exact bytes this diff describes. Cascading is what keeps the table
    // honest: a version purged by retention takes every diff computed from it
    // with it, rather than leaving a mask that claims to describe it.
    table.bigInteger("beforeMediaVersionId").notNullable();
    table
      .foreign("beforeMediaVersionId")
      .references("media_versions.id")
      .onDelete("cascade");
    table.bigInteger("afterMediaVersionId").notNullable();
    table
      .foreign("afterMediaVersionId")
      .references("media_versions.id")
      .onDelete("cascade");

    table.specificType("jobStatus", "job_status").defaultTo("pending");

    // Share of pixels that differ, 0 to 1. 1 when the two halves have different
    // layouts, which odiff reports instead of a per-pixel score. Null until the
    // job has run.
    table.decimal("score", 10, 5);

    // Content-addressed key of the mask, `media/<projectId>/diffs/<sha256>.png`.
    // Two pairs that produce the same mask share one object, so the same
    // screenshot re-uploaded unchanged on many pull requests stores it once.
    table.string("key");

    // The mask's own dimensions: the union of the two halves, since odiff pads
    // both to a common canvas before comparing. The viewer sizes its frame from
    // these and places each half at the top left inside it, which is where the
    // padding put them.
    table.integer("width");
    table.integer("height");

    // One diff per pair of versions. Also what makes scheduling idempotent: two
    // uploads racing on the same pair both insert, one is ignored, and only the
    // one that actually inserted queues the job.
    table.unique(["beforeMediaVersionId", "afterMediaVersionId"]);

    // The unique index above already covers lookups (and the cascade) on the
    // "before" side, being its leading column. The "after" side has nothing.
    table.index(["afterMediaVersionId"]);

    // The purge deletes a mask object once no surviving diff points at it.
    table.index(["key"]);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("media_diffs");
};
