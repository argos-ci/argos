exports.seed = (knex, Promise) =>
  knex('repositories').delete()
    .then(() => Promise.all([
      knex('repositories').insert([
        {
          id: 1,
          githubId: 23083156,
          name: 'material-ui',
          enabled: true,
          token: 'Qns97I3q7XxryiU0Hm0sRk1s6YXO93Vc',
          organizationId: 1,
          baselineBranch: 'master',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          githubId: 31123797,
          name: 'SplitMe',
          enabled: true,
          token: 'Qns97I3q7XxryiU0Hm0sRk1s6YXO93Vd',
          userId: 1,
          baselineBranch: 'master',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
    ]))
