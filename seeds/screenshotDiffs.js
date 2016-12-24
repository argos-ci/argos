exports.seed = (knex, Promise) => {
  return knex('screenshot_diffs').delete()
    .then(() => {
      return Promise.all([
        knex('screenshot_diffs').insert({
          buildId: 1,
          baseScreenshotId: 1,
          compareScreenshotId: 2,
          score: 4,
          jobStatus: 'done',
          validationStatus: 'unknown',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ]);
    });
};
