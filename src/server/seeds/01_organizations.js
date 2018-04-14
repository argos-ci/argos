exports.seed = (knex, Promise) =>
  knex
    .raw('TRUNCATE organizations CASCADE')
    .then(() => knex('organizations').delete())
    .then(() =>
      Promise.all([
        knex('organizations').insert([
          {
            id: '1',
            githubId: 1262264,
            name: 'Call-Em-All',
            login: 'callemall',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '2',
            githubId: 5823649,
            name: 'Doctolib',
            login: 'doctolib',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      ])
    )
