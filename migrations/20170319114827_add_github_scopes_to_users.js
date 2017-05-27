exports.up = knex =>
  knex.schema.table('users', table => {
    table.jsonb('githubScopes')
  })

exports.down = knex =>
  knex.schema.table('users', table => {
    table.dropColumn('githubScopes')
  })
