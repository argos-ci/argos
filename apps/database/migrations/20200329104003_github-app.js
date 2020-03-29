exports.up = async (knex) => {
  await knex.schema
    .createTable('installations', (table) => {
      table.bigincrements('id').primary()
      table.dateTime('createdAt').notNullable()
      table.dateTime('updatedAt').notNullable()
      table.integer('githubId').notNullable().index()
      table.boolean('deleted').notNullable().defaultTo(false)
    })
    .createTable('installation_repository_rights', (table) => {
      table.bigincrements('id').primary()
      table.dateTime('createdAt').notNullable()
      table.dateTime('updatedAt').notNullable()
      table.bigInteger('installationId').notNullable().index()
      table.foreign('installationId').references('installations.id')
      table.bigInteger('repositoryId').notNullable().index()
      table.foreign('repositoryId').references('repositories.id')
    })
    .createTable('user_installation_rights', (table) => {
      table.bigincrements('id').primary()
      table.dateTime('createdAt').notNullable()
      table.dateTime('updatedAt').notNullable()
      table.bigInteger('userId').notNullable().index()
      table.foreign('userId').references('users.id')
      table.bigInteger('installationId').notNullable().index()
      table.foreign('installationId').references('installations.id')
    })

  await knex.schema.table('synchronizations', (table) => {
    table.dropColumn('type')
  })

  await knex.schema.table('synchronizations', (table) => {
    table.string('type').index()
    table.bigInteger('installationId').index()
    table.foreign('installationId').references('installations.id')
  })

  await knex.raw(`update synchronizations set type = 'user';`)

  await knex.raw(`alter table synchronizations alter column type set not null;`)
  await knex.raw(
    `alter table synchronizations alter column "userId" drop not null;`,
  )

  await knex.raw(`
  CREATE TYPE synchronization_type AS ENUM('user', 'installation');
  ALTER TABLE synchronizations ALTER COLUMN "type" TYPE synchronization_type USING "type"::text::synchronization_type;`)
}

exports.down = async (knex) => {
  await knex.schema
    .dropTable('user_installation_rights')
    .dropTable('installation_repository_rights')
    .dropTable('installations')
}
