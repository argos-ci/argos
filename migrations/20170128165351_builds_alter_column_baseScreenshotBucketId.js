exports.up = knex =>
  knex.raw('ALTER TABLE builds ALTER COLUMN "baseScreenshotBucketId" DROP NOT NULL')

exports.down = knex =>
  knex.raw('ALTER TABLE builds ALTER COLUMN "baseScreenshotBucketId" SET NOT NULL')
