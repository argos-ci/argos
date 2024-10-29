/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema
    .raw(`ALTER TYPE build_notifications_type ADD VALUE 'diff-accepted'`)
    .raw(`ALTER TYPE build_notifications_type ADD VALUE 'diff-rejected'`);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.raw(`
      DELETE FROM pg_enum
      WHERE enumlabel = 'diff-accepted'
      AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'build_notifications_type'
      )
    `).raw(`
      DELETE FROM pg_enum
      WHERE enumlabel = 'diff-rejected'
      AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'build_notifications_type'
      )
    `);
};

export const config = { transaction: false };
