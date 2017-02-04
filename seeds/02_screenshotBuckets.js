exports.seed = (knex, Promise) => {
  return knex.raw('TRUNCATE screenshot_buckets CASCADE')
    .then(() => {
      return Promise.all([
        knex('screenshot_buckets').insert({
          id: 1,
          name: 'default',
          commit: '029b662f3ae57bae7a215301067262c1e95bbc95',
          branch: 'master',
          repositoryId: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        knex('screenshot_buckets').insert({
          id: 2,
          name: 'default',
          commit: '5a23b6f173d9596a09a73864ab051ea5972e8804',
          branch: 'master',
          repositoryId: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        knex('screenshot_buckets').insert({
          id: 3,
          name: 'default',
          commit: '2f73c43533f7d36743c0bee5d0b10f746be3f92c',
          branch: 'list-item-text-inset-prop',
          repositoryId: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ])
    })
}
