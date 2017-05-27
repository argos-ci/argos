exports.up = knex =>
  knex.schema.table('repositories', table => {
    table.bigInteger('userId').index()
    table.foreign('userId').references('users.id')
  })

exports.down = knex =>
  knex.schema.table('repositories', table => {
    table.dropColumn('userId')
  })
