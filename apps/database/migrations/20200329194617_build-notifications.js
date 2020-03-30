exports.up = (knex) =>
  knex.schema.raw(
    `
  ALTER TYPE build_notifications_type RENAME TO build_notifications_type_old;

  CREATE TYPE build_notifications_type AS ENUM('diff-rejected', 'diff-accepted', 'diff-detected', 'no-diff-detected', 'progress', 'queued');

  ALTER TABLE build_notifications ALTER COLUMN "type" TYPE build_notifications_type USING "type"::text::build_notifications_type;

  DROP TYPE build_notifications_type_old;
  `,
  )

exports.down = (knex) =>
  knex.schema.raw(
    `
  ALTER TYPE build_notifications_type RENAME TO build_notifications_type_old;

  CREATE TYPE build_notifications_type AS ENUM('diff-rejected', 'diff-accepted', 'diff-detected', 'no-diff-detected', 'progress');

  ALTER TABLE build_notifications ALTER COLUMN "type" TYPE build_notifications_type USING "type"::text::build_notifications_type;

  DROP TYPE build_notifications_type_old;
  `,
  )
