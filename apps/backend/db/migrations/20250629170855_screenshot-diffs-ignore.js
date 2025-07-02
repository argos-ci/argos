/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("screenshot_diffs", (table) => {
    table.boolean("ignored").defaultTo(false);
  });

  // Update existing recors in batch to avoid long transaction times
  // and to prevent locking the table for too long.
  while (true) {
    const updated = await knex("screenshot_diffs")
      .whereNull("ignored")
      .limit(100_000)
      .update({ ignored: false });
    if (updated === 0) {
      break;
    }
  }

  await knex.raw(`
    ALTER TABLE screenshot_diffs ADD CONSTRAINT screenshot_diffs_ignored_not_null_constraint CHECK (ignored IS NOT NULL) NOT VALID;
  `);

  await knex.raw(`
    ALTER TABLE screenshot_diffs VALIDATE CONSTRAINT screenshot_diffs_ignored_not_null_constraint;
  `);

  await knex.raw(`
    ALTER TABLE screenshot_diffs ALTER column ignored SET NOT NULL;
  `);

  await knex.raw(`
    ALTER TABLE screenshot_diffs DROP CONSTRAINT screenshot_diffs_ignored_not_null_constraint;
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("screenshot_diffs", (table) => {
    table.dropColumn("ignored");
  });
};

export const config = { transaction: false };
