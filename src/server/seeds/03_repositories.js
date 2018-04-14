exports.seed = (knex, Promise) =>
  knex('repositories')
    .delete()
    .then(() =>
      Promise.all([
        knex('repositories').insert([
          {
            id: '1',
            githubId: 23083156,
            name: 'material-ui',
            enabled: true,
            token: '650ded7d72e85b52e099df6e56aa204d4fe92fd1',
            organizationId: '1',
            baselineBranch: 'next',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '2',
            githubId: 31123797,
            name: 'SplitMe',
            enabled: true,
            token: '650ded7d72e85b52e099df6e56aa204d4fe92fd2',
            userId: '1',
            baselineBranch: 'master',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '3',
            githubId: 14022421,
            name: 'doctolib',
            enabled: true,
            token: '650ded7d72e85b52e099df6e56aa204d4fe92fd3',
            organizationId: '2',
            private: true,
            baselineBranch: 'master',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      ])
    )
