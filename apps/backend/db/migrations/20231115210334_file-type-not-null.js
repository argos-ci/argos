/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(`
    ALTER TABLE files ADD CONSTRAINT files_type_not_null_constraint CHECK (type IS NOT NULL) NOT VALID;
  `);

  await knex.raw(`
    ALTER TABLE files VALIDATE CONSTRAINT files_type_not_null_constraint;
  `);

  await knex.raw(`
    ALTER TABLE files ALTER column type SET NOT NULL;
  `);

  await knex.raw(`
    ALTER TABLE files DROP CONSTRAINT files_type_not_null_constraint;
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`
    ALTER TABLE files ALTER column type DROP NOT NULL;
  `);
};

export const config = { transaction: false };
