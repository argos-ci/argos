exports.seed = (knex, Promise) => {
  return knex('builds').delete()
    .then(() => {
      return Promise.all([
        knex('builds').insert({
          id: 1,
          baseScreenshotBucketId: null,
          compareScreenshotBucketId: 1,
          repositoryId: 1,
          createdAt: '2017-02-02T15:05:55.293Z',
          updatedAt: '2017-02-02T15:05:55.293Z',
        }),
        knex('builds').insert({
          id: 2,
          baseScreenshotBucketId: 1,
          compareScreenshotBucketId: 2,
          repositoryId: 1,
          createdAt: '2017-02-03T15:05:55.293Z',
          updatedAt: '2017-02-03T15:05:55.293Z',
        }),
        knex('builds').insert({
          id: 3,
          baseScreenshotBucketId: 2,
          compareScreenshotBucketId: 3,
          repositoryId: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ])
    })
}
