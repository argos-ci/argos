/**
 * Move build-number allocation to a per-project counter.
 *
 * A build number is user-facing — it is the build's URL — and must be unique
 * within a project. It used to be allocated inline with
 * `select coalesce(max(number),0) + 1 from builds where "projectId" = ?`, a
 * read-modify-write with no unique constraint behind it: two concurrent inserts
 * read the same max and produced the same number. It also reused the number of
 * the most recent build whenever that build was deleted.
 *
 * `projects."buildNumber"` replaces it. Allocation becomes
 * `UPDATE projects SET "buildNumber" = "buildNumber" + 1 ... RETURNING`, which
 * is atomic: the row lock serializes concurrent allocations, and the counter
 * never goes backwards when a build is deleted.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("projects", (table) => {
    table.integer("buildNumber").notNullable().defaultTo(0);
  });

  await knex.raw(`
    UPDATE projects p
    SET "buildNumber" = COALESCE(
      (SELECT max(number) FROM builds WHERE "projectId" = p.id),
      0
    )
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("buildNumber");
  });
};
