/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  await knex.schema.alterTable("comments", (table) => {
    table.dateTime("deletedAt").nullable();
  });
  // Comments are listed per build, ordered by creation date, and deleted
  // comments are filtered out. A partial index on the non-deleted rows keeps
  // that query fast without indexing soft-deleted comments.
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS comments_buildid_createdat_active_index
    ON comments ("buildId", "createdAt")
    WHERE "deletedAt" IS NULL
  `);
}

/**
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS comments_buildid_createdat_active_index`,
  );
  await knex.schema.alterTable("comments", (table) => {
    table.dropColumn("deletedAt");
  });
}

export const config = { transaction: false };
