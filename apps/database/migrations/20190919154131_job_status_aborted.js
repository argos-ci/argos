exports.up = (knex) =>
  knex.schema.raw(
    `
  ALTER TYPE job_status RENAME TO job_status_old;

  CREATE TYPE job_status AS ENUM('pending', 'progress', 'complete', 'error', 'aborted');

  ALTER TABLE builds ALTER COLUMN "jobStatus" TYPE job_status USING "jobStatus"::text::job_status;
  ALTER TABLE screenshot_diffs ALTER COLUMN "jobStatus" TYPE job_status USING "jobStatus"::text::job_status;
  ALTER TABLE synchronizations ALTER COLUMN "jobStatus" TYPE job_status USING "jobStatus"::text::job_status;
  ALTER TABLE build_notifications ALTER COLUMN "jobStatus" TYPE job_status USING "jobStatus"::text::job_status;

  DROP TYPE job_status_old;
  `
  );

exports.down = (knex) =>
  knex.schema.raw(
    `
  ALTER TYPE job_status RENAME TO job_status_old;

  CREATE TYPE job_status AS ENUM('pending', 'progress', 'complete', 'error');

  ALTER TABLE builds ALTER COLUMN "jobStatus" TYPE job_status USING "jobStatus"::text::job_status;
  ALTER TABLE screenshot_diffs ALTER COLUMN "jobStatus" TYPE job_status USING "jobStatus"::text::job_status;
  ALTER TABLE synchronizations ALTER COLUMN "jobStatus" TYPE job_status USING "jobStatus"::text::job_status;
  ALTER TABLE build_notifications ALTER COLUMN "jobStatus" TYPE job_status USING "jobStatus"::text::job_status;

  DROP TYPE job_status_old;
  `
  );
