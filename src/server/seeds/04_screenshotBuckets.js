exports.seed = (knex, Promise) =>
  knex('screenshot_buckets')
    .delete()
    .then(() =>
      Promise.all([
        knex('screenshot_buckets').insert([
          {
            id: '1',
            name: 'default',
            commit: '029b662f3ae57bae7a215301067262c1e95bbc95',
            branch: 'master',
            repositoryId: '1',
            createdAt: '2016-12-08T22:59:55Z',
            updatedAt: '2016-12-08T22:59:55Z',
          },
          {
            id: '2',
            name: 'default',
            commit: '5a23b6f173d9596a09a73864ab051ea5972e8804',
            branch: 'master',
            repositoryId: '1',
            createdAt: '2016-12-12T17:44:29Z',
            updatedAt: '2016-12-12T17:44:29Z',
          },
          {
            id: '3',
            name: 'default',
            commit: '2f73c43533f7d36743c0bee5d0b10f746be3f92c',
            branch: 'list-item-text-inset-prop',
            repositoryId: '1',
            createdAt: '2017-02-02T19:55:09Z',
            updatedAt: '2017-02-02T19:55:09Z',
          },
          {
            id: '4',
            name: 'default',
            commit: '1ffac615b85e8a63424252768d21b62381f1b44e',
            branch: 'list-item-text-inset-prop',
            repositoryId: '1',
            createdAt: '2017-02-05T23:46:59Z',
            updatedAt: '2017-02-05T23:46:59Z',
          },
          {
            id: '5',
            name: 'default',
            commit: '852cffe72a964f3783631a0ddc0b51484831363f',
            branch: 'list-item-text-inset-prop',
            repositoryId: '1',
            createdAt: '2017-02-06T01:27:34Z',
            updatedAt: '2017-02-06T01:27:34Z',
          },
          {
            id: '6',
            name: 'default',
            commit: '8fcaca081dcf18815b474d68b3c4952f4adc83cb',
            branch: 'list-item-text-inset-prop',
            repositoryId: '1',
            createdAt: '2017-02-06T01:41:35Z',
            updatedAt: '2017-02-06T01:41:35Z',
          },
        ]),
      ])
    )
