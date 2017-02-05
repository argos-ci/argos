exports.seed = (knex, Promise) => {
  return knex('repositories').delete()
    .then(() => {
      return Promise.all([
        knex('repositories').insert({
          id: 1,
          githubId: 23083156,
          name: 'material-ui',
          enabled: true,
          token: '79579349bdea7f9da50a964a36d5e6d7092c9aaca2250925842d1f6a801a64d3',
          organizationId: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ])
    })
}
