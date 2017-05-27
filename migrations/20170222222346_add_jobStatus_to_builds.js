exports.up = async knex => {
  await knex.schema.table('builds', table => {
    table.string('jobStatus')
  })
  await knex.raw('UPDATE builds SET "jobStatus" = \'complete\'')
  await knex.raw('ALTER TABLE builds ALTER COLUMN "jobStatus" SET NOT NULL')
}

exports.down = async knex => {
  await knex.schema.table('builds', table => {
    table.dropColumn('jobStatus')
  })
}
