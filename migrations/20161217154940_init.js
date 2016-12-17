exports.up = knex =>
  knex.schema
    .createTable('users', (table) => {
      table.bigincrements('id').primary();
      table.integer('githubId').notNullable().index();
      table.string('name').notNullable();
      table.string('email').notNullable();
      table.dateTime('createdAt').notNullable();
      table.dateTime('updatedAt').notNullable();
    })
    .createTable('organizations', (table) => {
      table.bigincrements('id').primary();
      table.integer('githubId').notNullable().index();
      table.string('name').notNullable();
      table.dateTime('createdAt').notNullable();
      table.dateTime('updatedAt').notNullable();
    })
    .createTable('repositories', (table) => {
      table.bigincrements('id').primary();
      table.integer('githubId').notNullable().index();
      table.string('name').notNullable();
      table.boolean('enabled').notNullable().defaultTo(false).index();
      table.dateTime('createdAt').notNullable();
      table.dateTime('updatedAt').notNullable();
    })
    .createTable('screenshotBuckets', (table) => {
      table.bigincrements('id').primary();
      table.string('name').notNullable().index();
      table.string('commit').notNullable().index();
      table.string('branch').notNullable();
      table.string('jobStatus').notNullable();
      table.dateTime('createdAt').notNullable();
      table.dateTime('updatedAt').notNullable();
    })
    .createTable('screenshots', (table) => {
      table.bigincrements('id').primary();
      table.bigInteger('screenshotBucketId').notNullable().references('screenshotBuckets.id');
      table.string('name').notNullable().index();
      table.string('s3Id').notNullable().index();
      table.dateTime('createdAt').notNullable();
      table.dateTime('updatedAt').notNullable();
    })
    .createTable('builds', (table) => {
      table.bigincrements('id').primary();
      table.bigInteger('baseScreenshotBucketId').notNullable().references('screenshotBuckets.id');
      table.bigInteger('compareScreenshotBucketId').notNullable().references('screenshotBuckets.id');
      table.dateTime('createdAt').notNullable();
      table.dateTime('updatedAt').notNullable();
    })
    .createTable('screenshotDiffs', (table) => {
      table.bigincrements('id').primary();
      table.bigInteger('buildId').notNullable().references('builds.id');
      table.bigInteger('baseScreenshotId').notNullable().references('screenshots.id');
      table.bigInteger('compareScreenshotId').notNullable().references('screenshots.id');
      table.integer('score').notNullable();
      table.string('jobStatus').notNullable();
      table.string('validationStatus').notNullable();
      table.dateTime('createdAt').notNullable();
      table.dateTime('updatedAt').notNullable();
    });

exports.down = knex =>
  knex.schema
    .dropTableIfExists('users')
    .dropTableIfExists('screenshotDiffs')
    .dropTableIfExists('builds')
    .dropTableIfExists('screenshots')
    .dropTableIfExists('screenshotBuckets')
    .dropTableIfExists('repositories')
    .dropTableIfExists('organizations');
