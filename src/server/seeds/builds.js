exports.seed = (knex, Promise) =>
  knex('builds')
    .delete()
    .then(() =>
      Promise.all([
        knex('builds').insert([
          {
            id: '1',
            number: 1,
            baseScreenshotBucketId: '1',
            compareScreenshotBucketId: '1',
            repositoryId: 1,
            jobStatus: 'complete',
            createdAt: '2016-12-08T22:59:55Z',
            updatedAt: '2016-12-08T22:59:55Z',
          },
          {
            id: '2',
            number: 2,
            baseScreenshotBucketId: '1',
            compareScreenshotBucketId: '2',
            repositoryId: 1,
            jobStatus: 'complete',
            createdAt: '2016-12-12T17:44:29Z',
            updatedAt: '2016-12-12T17:44:29Z',
          },
          {
            id: '3',
            number: 3,
            baseScreenshotBucketId: '2',
            compareScreenshotBucketId: '3',
            repositoryId: 1,
            jobStatus: 'complete',
            createdAt: '2017-02-02T19:55:09Z',
            updatedAt: '2017-02-02T19:55:09Z',
          },
          {
            id: '4',
            number: 4,
            baseScreenshotBucketId: '3',
            compareScreenshotBucketId: '4',
            repositoryId: 1,
            jobStatus: 'complete',
            createdAt: '2017-02-05T23:46:59Z',
            updatedAt: '2017-02-05T23:46:59Z',
          },
          {
            id: '5',
            number: 5,
            baseScreenshotBucketId: '4',
            compareScreenshotBucketId: '5',
            repositoryId: 1,
            jobStatus: 'complete',
            createdAt: '2017-02-06T01:27:34Z',
            updatedAt: '2017-02-06T01:27:34Z',
          },
          {
            id: '6',
            number: 6,
            baseScreenshotBucketId: '5',
            compareScreenshotBucketId: '6',
            repositoryId: 1,
            jobStatus: 'complete',
            createdAt: '2017-02-06T01:41:35Z',
            updatedAt: '2017-02-06T01:41:35Z',
          },
        ]),
      ])
    )
