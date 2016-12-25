exports.seed = (knex, Promise) => {
  return knex('repositories').delete()
    .then(() => {
      return Promise.all([
        knex('repositories').insert({
          githubId: 23083156,
          name: 'material-ui',
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ]);
    });
};
