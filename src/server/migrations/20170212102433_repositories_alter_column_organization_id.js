exports.up = knex => knex.raw('ALTER TABLE repositories ALTER COLUMN "organizationId" TYPE BIGINT')

exports.down = knex =>
  knex.raw('ALTER TABLE repositories ALTER COLUMN "organizationId" TYPE INTEGER')
