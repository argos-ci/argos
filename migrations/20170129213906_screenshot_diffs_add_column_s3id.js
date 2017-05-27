exports.up = knex =>
  knex.schema.table('screenshot_diffs', table => {
    table.string('s3Id')
  })

exports.down = knex =>
  knex.schema.table('screenshot_diffs', table => {
    table.dropColumn('s3Id')
  })
