exports.up = knex =>
  knex.schema
    .table('repositories', table => {
      table.string('token').index()
    })
    .table('screenshot_buckets', table => {
      table
        .bigInteger('repositoryId')
        .notNullable()
        .references('repositories.id')
    })
    .table('builds', table => {
      table
        .bigInteger('repositoryId')
        .notNullable()
        .references('repositories.id')
    })

exports.down = knex =>
  knex.schema
    .table('repositories', table => {
      table.dropColumn('token')
    })
    .table('screenshot_buckets', table => {
      table.dropColumn('repositoryId')
    })
    .table('builds', table => {
      table.dropColumn('repositoryId')
    })
