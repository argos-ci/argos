exports.seed = (knex, Promise) =>
  knex('organizations').delete()
    .then(() => Promise.all([
      knex('organizations').insert({
        id: 1,
        githubId: 1262264,
        name: 'Call-Em-All',
        login: 'callemall',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ]))
