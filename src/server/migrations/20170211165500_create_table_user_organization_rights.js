exports.up = knex =>
  knex.schema.createTable('user_organization_rights', table => {
    table.bigincrements('id').primary()
    table
      .bigInteger('userId')
      .notNullable()
      .index()
    table.foreign('userId').references('users.id')
    table
      .bigInteger('organizationId')
      .notNullable()
      .index()
    table.foreign('organizationId').references('organizations.id')
    table.dateTime('createdAt').notNullable()
    table.dateTime('updatedAt').notNullable()
    table.unique(['userId', 'organizationId'])
  })

exports.down = knex => knex.schema.dropTableIfExists('user_organization_rights')
