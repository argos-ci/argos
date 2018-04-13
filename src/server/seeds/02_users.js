exports.seed = (knex, Promise) =>
  knex
    .raw('TRUNCATE users CASCADE')
    .then(() => knex('users').delete())
    .then(() =>
      Promise.all([
        knex('users').insert([
          {
            id: '1',
            githubId: 3165635,
            name: 'Olivier Tassinari',
            login: 'oliviertassinari',
            email: 'olivier.tassinari@gmail.com',
            scopes: JSON.stringify(['SUPER_ADMIN']),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '2',
            githubId: 266302,
            name: 'Greg Bergé',
            login: 'neoziro',
            email: 'berge.greg@gmail.com',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      ])
    )
