/* eslint-disable quotes, max-len */

exports.up = knex =>
  knex.schema
    .raw(
      `CREATE TYPE build_notifications_type AS ENUM ('progress', 'no-diff-detected', 'diff-detected')`
    )
    .createTable('build_notifications', table => {
      table.bigincrements('id').primary()
      table.specificType('type', 'build_notifications_type').notNullable()
      table.specificType('jobStatus', 'job_status').notNullable()
      table
        .bigInteger('buildId')
        .notNullable()
        .index()
      table.foreign('buildId').references('builds.id')
      table.dateTime('createdAt').notNullable()
      table.dateTime('updatedAt').notNullable()
    })

exports.down = knex =>
  knex.schema.dropTableIfExists('build_notifications').raw(`DROP TYPE build_notifications_type`)
