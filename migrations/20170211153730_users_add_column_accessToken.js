exports.up = knex =>
  knex.schema.table('users', table => {
    table.string('accessToken')
  })

exports.down = knex =>
  knex.schema.table('users', table => {
    table.dropColumn('accessToken')
  })
