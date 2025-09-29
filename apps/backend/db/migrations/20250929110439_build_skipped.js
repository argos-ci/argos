/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(`ALTER TABLE builds DROP CONSTRAINT builds_type_check`);
  await knex.raw(
    `ALTER TABLE builds ADD CONSTRAINT builds_type_check CHECK (type = ANY (ARRAY['reference'::text, 'check'::text, 'orphan'::text, 'skipped'::text])) NOT VALID`,
  );
  await knex.raw(`
    ALTER TABLE builds VALIDATE CONSTRAINT builds_type_check
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`ALTER TABLE builds DROP CONSTRAINT builds_type_check`);
  await knex.raw(
    `ALTER TABLE builds ADD CONSTRAINT builds_type_check CHECK (type = ANY (ARRAY['reference'::text, 'check'::text, 'orphan'::text])) NOT VALID`,
  );
  await knex.raw(`
    ALTER TABLE builds VALIDATE CONSTRAINT builds_type_check
  `);
};

export const config = { transaction: false };
