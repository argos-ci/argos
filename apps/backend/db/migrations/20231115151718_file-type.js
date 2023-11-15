/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(`ALTER TABLE files DROP CONSTRAINT files_type_check`);

  await knex.raw(
    `ALTER TABLE files ADD CONSTRAINT files_type_check CHECK ((type = ANY (ARRAY['screenshot'::text, 'screenshotDiff'::text, 'playwrightTrace'::text]))) NOT VALID`,
  );

  await knex.raw(`
    ALTER TABLE files VALIDATE CONSTRAINT files_type_check
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`ALTER TABLE files DROP CONSTRAINT files_type_check`);

  await knex.raw(
    `ALTER TABLE files ADD CONSTRAINT files_type_check CHECK ((type = ANY (ARRAY['screenshot'::text, 'playwrightTrace'::text]))) NOT VALID`,
  );

  await knex.raw(`
    ALTER TABLE files VALIDATE CONSTRAINT files_type_check
  `);
};

export const config = { transaction: false };
