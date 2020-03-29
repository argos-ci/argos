exports.up = async knex =>
  knex.schema
    .table('builds', t => t.index('baseScreenshotBucketId'))
    .table('builds', t => t.index('compareScreenshotBucketId'))
    .table('screenshot_diffs', t => t.index('buildId'))
    .table('screenshots', t => t.index('screenshotBucketId'))

exports.down = async knex =>
  knex.schema
    .table('builds', t => t.dropIndex('baseScreenshotBucketId'))
    .table('builds', t => t.dropIndex('compareScreenshotBucketId'))
    .table('screenshot_diffs', t => t.dropIndex('buildId'))
    .table('screenshots', t => t.dropIndex('screenshotBucketId'))
