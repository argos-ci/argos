exports.up = knex =>
  knex.schema.table('screenshot_buckets', table => {
    table.dropColumn('jobStatus')
  })

exports.down = knex =>
  knex.schema.table('screenshot_buckets', table => {
    table.string('jobStatus').notNullable()
  })
