exports.up = async knex =>
  knex.schema.table('builds', table => {
    table.string('externalId').index()
    table.integer('batchCount')
  })

exports.down = async knex =>
  knex.schema.table('builds', table => {
    table.dropColumn('externalId')
    table.dropColumn('batchCount')
  })
