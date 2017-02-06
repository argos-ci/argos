exports.seed = (knex, Promise) => {
  return knex('screenshots').delete()
    .then(() => {
      return Promise.all([
        knex('screenshots').insert({
          id: 1,
          screenshotBucketId: 1,
          name: 'ListItem/IconListItem',
          // s3Id: 'https://raw.githubusercontent.com/callemall/material-ui/029b662f3ae57bae7a215301067262c1e95bbc95/test/regressions/screenshots/baseline/ListItem/IconListItem/chrome-53.0.2785.143-linux.png',
          s3Id: '1.png',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        knex('screenshots').insert({
          id: 2,
          screenshotBucketId: 2,
          name: 'ListItem/IconListItem',
          // s3Id: 'https://raw.githubusercontent.com/callemall/material-ui/5a23b6f173d9596a09a73864ab051ea5972e8804/test/regressions/screenshots/baseline/ListItem/IconListItem/chrome-53.0.2785.143-linux.png',
          s3Id: '2.png',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        knex('screenshots').insert({
          id: 3,
          screenshotBucketId: 3,
          name: 'ListItem/IconListItem',
          // s3Id: 'https://raw.githubusercontent.com/callemall/material-ui/2f73c43533f7d36743c0bee5d0b10f746be3f92c/test/regressions/screenshots/baseline/ListItem/IconListItem/chrome-53.0.2785.143-linux.png',
          s3Id: '3.png',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ])
    })
}
