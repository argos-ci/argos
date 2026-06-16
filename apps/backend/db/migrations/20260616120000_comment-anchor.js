/**
 * Anchor a comment to a screenshot diff, optionally at a specific position or
 * line range. The anchor lives on the root comment only; replies inherit it
 * through their thread (like `resolvedAt`).
 *
 * - `screenshotDiffId`: the diff the comment is about (null = a plain build
 *   comment, the existing behaviour).
 * - `anchor`: where on that diff the comment points. Null means the whole diff;
 *   otherwise a discriminated shape:
 *     { type: "point", side: "baseline" | "compare", x: 0..1, y: 0..1 }
 *     { type: "lines", from: int, to: int }
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("comments", (table) => {
    table.bigInteger("screenshotDiffId");
    table
      .foreign("screenshotDiffId")
      .references("screenshot_diffs.id")
      .onDelete("CASCADE");
    table.index("screenshotDiffId");

    table.jsonb("anchor");
  });

  // An anchor only makes sense against a diff: a position/line range with no
  // diff to resolve it against would be meaningless.
  await knex.raw(`
    ALTER TABLE comments
    ADD CONSTRAINT comments_anchor_requires_diff
    CHECK ("anchor" IS NULL OR "screenshotDiffId" IS NOT NULL);
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(
    `ALTER TABLE comments DROP CONSTRAINT comments_anchor_requires_diff;`,
  );
  await knex.schema.alterTable("comments", (table) => {
    table.dropColumn("anchor");
    table.dropColumn("screenshotDiffId");
  });
};
