/* eslint-disable quotes, max-len */

exports.up = knex =>
  knex.schema
    .raw(`ALTER TYPE build_notifications_type ADD VALUE 'diff-accepted'`)
    .raw(`ALTER TYPE build_notifications_type ADD VALUE 'diff-rejected'`)

exports.down = knex =>
  knex.schema.raw(`
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
    `)

exports.config = { transaction: false }
