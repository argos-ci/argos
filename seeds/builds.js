exports.seed = (knex, Promise) => {
  return knex('builds').delete()
    .then(() => {
      return Promise.all([
        knex('builds').insert({
          id: 1,
          baseScreenshotBucketId: 1,
          compareScreenshotBucketId: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ]);
    });
};
