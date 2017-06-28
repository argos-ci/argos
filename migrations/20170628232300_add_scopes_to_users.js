exports.up = knex =>
  knex.schema.table('users', table => {
    table.jsonb('scopes')
  })

exports.down = knex =>
  knex.schema.table('users', table => {
    table.dropColumn('scopes')
  })
