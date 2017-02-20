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
        knex('screenshots').insert({
          id: 4,
          screenshotBucketId: 4,
          name: 'ListItem/IconListItem',
          // s3Id: 'https://raw.githubusercontent.com/callemall/material-ui/1ffac615b85e8a63424252768d21b62381f1b44e/test/regressions/screenshots/baseline/ListItem/IconListItem/chrome-53.0.2785.143-linux.png',
          s3Id: '4.png',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        knex('screenshots').insert({
          id: 5,
          screenshotBucketId: 5,
          name: 'ListItem/IconListItem',
          // s3Id: 'https://raw.githubusercontent.com/callemall/material-ui/852cffe72a964f3783631a0ddc0b51484831363f/test/regressions/screenshots/baseline/ListItem/IconListItem/chrome-53.0.2785.143-linux.png',
          s3Id: '5.png',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        knex('screenshots').insert({
          id: 6,
          screenshotBucketId: 6,
          name: 'ListItem/IconListItem',
          // s3Id: 'https://raw.githubusercontent.com/callemall/material-ui/8fcaca081dcf18815b474d68b3c4952f4adc83cb/test/regressions/screenshots/baseline/ListItem/IconListItem/chrome-53.0.2785.143-linux.png',
          s3Id: '6.png',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        knex('screenshots').insert({
          id: 7,
          screenshotBucketId: 6,
          name: 'ListItem/PrimaryActionCheckboxListItem',
          // s3Id: 'https://raw.githubusercontent.com/callemall/material-ui/8c1265eabdbb83778abf5cecd1e685a5742903d7/test/regressions/screenshots/baseline/ListItem/PrimaryActionCheckboxListItem/chrome-53.0.2785.143-linux.png',
          s3Id: '7.png',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        knex('screenshots').insert({
          id: 8,
          screenshotBucketId: 6,
          name: 'ListItem/PrimaryActionCheckboxListItem',
          // s3Id: 'https://raw.githubusercontent.com/callemall/material-ui/5a71e923860280dd6469936c43e57d6bfd220172/test/regressions/screenshots/baseline/ListItem/PrimaryActionCheckboxListItem/chrome-53.0.2785.143-linux.png',
          s3Id: '8.png',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ])
    })
}
