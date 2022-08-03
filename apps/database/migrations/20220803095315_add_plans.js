exports.up = async (knex) => {
  await knex.schema.createTable('accounts', (table) => {
    table.bigincrements('id').primary()
    table.timestamps(true, true)
    table.bigInteger('userId').index()
    table.foreign('userId').references('users.id')
    table.bigInteger('organizationId').index()
    table.foreign('organizationId').references('organizations.id')
  })

  await knex.schema.createTable('plans', (table) => {
    table.bigincrements('id').primary()
    table.timestamps(true, true)
    table.string('name').notNullable()
    table.integer('screenshotsQuota').notNullable()
    table.string('githubId')
  })

  await knex.schema.createTable('purchases', (table) => {
    table.bigincrements('id').primary()
    table.timestamps(true, true)
    table.bigInteger('planId').index()
    table.foreign('planId').references('plans.id')
    table.bigInteger('accountId').index()
    table.foreign('accountId').references('accounts.id')
  })
}

exports.down = async (knex) => {
  knex.schema.dropTableIfExists('accounts')
  knex.schema.dropTableIfExists('plans')
  knex.schema.dropTableIfExists('purchases')
}
