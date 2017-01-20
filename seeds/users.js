exports.seed = (knex, Promise) => {
  return knex('users').delete()
    .then(() => {
      return Promise.all([
        knex('users').insert({
          githubId: 4420103,
          name: 'Nathan',
          email: 'info@nathanmarks.io',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ])
    })
}
