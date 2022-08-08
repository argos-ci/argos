exports.up = async (knex) => {
  await knex.schema.createTable('accounts', (table) => {
    table.bigincrements('id').primary()
    table.dateTime('createdAt').notNullable()
    table.dateTime('updatedAt').notNullable()
    table.bigInteger('userId').index()
    table.foreign('userId').references('users.id')
    table.bigInteger('organizationId').index()
    table.foreign('organizationId').references('organizations.id')
  })
  await knex.raw(
    'ALTER TABLE accounts ADD CONSTRAINT accounts_only_one_non_null CHECK ("userId" IS NOT NULL OR "organizationId" IS NOT NULL)',
  )

  await knex.schema.createTable('plans', (table) => {
    table.bigincrements('id').primary()
    table.dateTime('createdAt').notNullable()
    table.dateTime('updatedAt').notNullable()
    table.string('name').notNullable()
    table.integer('screenshotsLimitPerMonth').notNullable()
    table.string('githubId').notNullable()
  })
  await knex.schema.createTable('purchases', (table) => {
    table.bigincrements('id').primary()
    table.dateTime('createdAt').notNullable()
    table.dateTime('updatedAt').notNullable()
    table.bigInteger('planId').index().notNullable()
    table.foreign('planId').references('plans.id')
    table.bigInteger('accountId').index().notNullable()
    table.foreign('accountId').references('accounts.id')
  })
}

exports.down = async (knex) => {
  await await knex.raw(
    'ALTER TABLE accounts DROP CONSTRAINT accounts_only_one_non_null',
  )
  await knex.schema.dropTableIfExists('purchases')
  await knex.schema.dropTableIfExists('plans')
  await knex.schema.dropTableIfExists('accounts')
}
