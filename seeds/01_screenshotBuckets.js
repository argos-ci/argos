exports.seed = (knex, Promise) => {
  return knex.raw('TRUNCATE screenshot_buckets CASCADE')
    .then(() => {
      return Promise.all([
        knex('screenshot_buckets').insert({
          id: 1,
          name: '567',
          commit: '029b662f3ae57bae7a215301067262c1e95bbc95',
          branch: 'oliviertassinari:improve-disabled-color',
          jobStatus: 'done',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        knex('screenshot_buckets').insert({
          id: 2,
          name: '688',
          commit: '5a23b6f173d9596a09a73864ab051ea5972e8804',
          branch: 'oliviertassinari:list-item-text-inset-prop',
          jobStatus: 'done',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ]);
    });
};
