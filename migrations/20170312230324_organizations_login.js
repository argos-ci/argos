exports.up = knex =>
  knex.schema
    .table('organizations', table => {
      table.string('login')
    })
    .raw('UPDATE organizations SET login = name')
    .raw('ALTER TABLE organizations ALTER COLUMN "login" SET NOT NULL')
    .raw('ALTER TABLE organizations ALTER COLUMN "name" DROP NOT NULL')

exports.down = knex =>
  knex.schema
    .table('organizations', table => {
      table.dropColumn('login')
    })
    .raw('ALTER TABLE organizations ALTER COLUMN "name" SET NOT NULL')
