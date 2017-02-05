exports.seed = (knex, Promise) => {
  return knex('organizations').delete()
    .then(() => {
      return Promise.all([
        knex('organizations').insert({
          id: 1,
          githubId: 1262264,
          name: 'Call-Em-All',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ])
    })
}
