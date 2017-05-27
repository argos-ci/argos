/* eslint-disable quotes */

exports.up = knex =>
  knex.schema
    .raw(`CREATE TYPE job_status AS ENUM ('pending', 'progress', 'complete', 'error')`)
    .raw(`CREATE TYPE service_type AS ENUM ('github')`)
    .alterTable('builds', table => {
      table.specificType('jobStatus', 'job_status').alter()
    })
    .alterTable('screenshot_diffs', table => {
      table.specificType('jobStatus', 'job_status').alter()
    })
    .raw(`ALTER TABLE screenshot_diffs ALTER COLUMN "score" SET NOT NULL`)
    .alterTable('synchronizations', table => {
      table.specificType('jobStatus', 'job_status').alter()
      table.specificType('type', 'service_type').alter()
    })
    .table('repositories', table => {
      table.foreign('organizationId').references('organizations.id')
    })

exports.down = knex =>
  knex.schema
    .alterTable('builds', table => {
      table.string('jobStatus').alter()
    })
    .alterTable('screenshot_diffs', table => {
      table.string('jobStatus').alter()
    })
    .alterTable('synchronizations', table => {
      table.string('jobStatus').alter()
      table.string('type').alter()
    })
    .raw(`ALTER TABLE screenshot_diffs ALTER COLUMN "score" DROP NOT NULL`)
    .raw(`DROP TYPE job_status`)
    .raw(`DROP TYPE service_type`)
    .table('repositories', table => {
      table.dropForeign('organizationId')
    })
