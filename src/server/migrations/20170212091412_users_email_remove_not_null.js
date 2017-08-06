exports.up = knex => knex.raw('ALTER TABLE users ALTER COLUMN "email" DROP NOT NULL')

exports.down = knex => knex.raw('ALTER TABLE users ALTER COLUMN "email" SET NOT NULL')
