exports.up = knex =>
  knex.schema.table('repositories', table => {
    table.integer('organizationId').index()
  })

exports.down = knex =>
  knex.schema.table('repositories', table => {
    table.dropColumn('organizationId')
  })
