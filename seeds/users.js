exports.seed = (knex, Promise) => {
  return knex('users').delete()
    .then(() => {
      return Promise.all([
        knex('users').insert([
          {
            githubId: 3165635,
            name: 'Olivier Tassinari',
            login: 'oliviertassinari',
            email: 'olivier.tassinari@gmail.com',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            githubId: 266302,
            name: 'Greg Bergé',
            login: 'neoziro',
            email: 'berge.greg@gmail.com',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      ])
    })
}
