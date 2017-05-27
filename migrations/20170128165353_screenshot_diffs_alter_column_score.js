exports.up = knex =>
  knex.raw('ALTER TABLE screenshot_diffs ALTER COLUMN "score" TYPE DECIMAL(10, 5)')

exports.down = knex => knex.raw('ALTER TABLE screenshot_diffs ALTER COLUMN "score" TYPE INTEGER')
