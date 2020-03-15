exports.up = async knex => {
  await knex.schema.table('users', table => {
    table
      .boolean('privateSync')
      .notNullable()
      .defaultTo(false)
  })
}

exports.down = async knex => {
  await knex.schema.table('users', table => {
    table.dropColumn('privateSync')
  })
}
