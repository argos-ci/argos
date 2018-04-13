exports.up = async knex => {
  await knex.schema.table('repositories', table => {
    table
      .boolean('private')
      .notNullable()
      .defaultTo(false)
  })
}

exports.down = async knex => {
  await knex.schema.table('repositories', table => {
    table.dropColumn('private')
  })
}
