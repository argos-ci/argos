exports.seed = (knex, Promise) => {
  return knex('screenshot_diffs').delete()
    .then(() => {
      return Promise.all([
        knex('screenshot_diffs').insert({
          buildId: 2,
          baseScreenshotId: 1,
          compareScreenshotId: 2,
          score: 0.312,
          jobStatus: 'complete',
          validationStatus: 'unknown',
          s3Id: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        knex('screenshot_diffs').insert({
          buildId: 3,
          baseScreenshotId: 2,
          compareScreenshotId: 3,
          score: 0.447,
          jobStatus: 'complete',
          validationStatus: 'unknown',
          s3Id: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ])
    })
}
