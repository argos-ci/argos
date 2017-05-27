exports.up = async knex => {
  await knex.schema.table('users', table => {
    table.string('login')
  })
  await knex.raw('UPDATE users SET login = name')
  await knex.raw('ALTER TABLE users ALTER COLUMN "login" SET NOT NULL')
  await knex.raw('ALTER TABLE users ALTER COLUMN "name" DROP NOT NULL')
}

exports.down = async knex => {
  await knex.schema.table('users', table => {
    table.dropColumn('login')
  })
  await knex.raw('ALTER TABLE users ALTER COLUMN "name" SET NOT NULL')
}
