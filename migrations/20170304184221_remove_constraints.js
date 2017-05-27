/* eslint-disable quotes */

exports.up = knex =>
  knex.schema.raw(`ALTER TABLE screenshot_diffs ALTER COLUMN "score" DROP NOT NULL`)

exports.down = knex =>
  knex.schema.raw(`ALTER TABLE screenshot_diffs ALTER COLUMN "score" SET NOT NULL`)
