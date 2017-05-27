exports.up = knex => knex.raw('ALTER TABLE screenshot_diffs ALTER COLUMN "score" DROP NOT NULL')

exports.down = knex => knex.raw('ALTER TABLE screenshot_diffs ALTER COLUMN "score" SET NOT NULL')
