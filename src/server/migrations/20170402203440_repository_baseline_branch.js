exports.up = knex =>
  knex.schema
    .table('repositories', table => {
      table
        .string('baselineBranch')
        .defaultTo('master')
        .notNullable()
    })
    .raw('ALTER TABLE repositories ALTER COLUMN "baselineBranch" DROP DEFAULT')

exports.down = knex =>
  knex.schema.table('repositories', table => {
    table.dropColumn('baselineBranch')
  })
