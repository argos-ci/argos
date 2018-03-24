exports.up = async knex =>
  knex.schema
    .createTable('screenshot_batches', table => {
      table.bigincrements('id').primary()
      table
        .bigInteger('screenshotBucketId')
        .notNullable()
        .index()
      table.string('externalId').notNullable()
      table.dateTime('createdAt').notNullable()
      table.dateTime('updatedAt').notNullable()
      table.foreign('screenshotBucketId').references('screenshot_buckets.id')
      table.unique(['screenshotBucketId', 'externalId'])
    })
    .table('screenshot_buckets', table => {
      table.integer('batchTotal')
    })
    .table('builds', table => {
      table.string('externalId').index()
    })
    .table('screenshots', table => {
      table.bigInteger('screenshotBatchId').index()
      table.foreign('screenshotBatchId').references('screenshot_batches.id')
    })

exports.down = async knex =>
  knex.schema
    .table('screenshots', table => {
      table.dropColumn('screenshotBatchId')
    })
    .table('builds', table => {
      table.dropColumn('externalId')
    })
    .table('screenshot_buckets', table => {
      table.dropColumn('batchTotal')
    })
    .dropTable('screenshot_batches')
