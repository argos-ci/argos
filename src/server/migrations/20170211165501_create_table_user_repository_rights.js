exports.up = knex =>
  knex.schema.createTable('user_repository_rights', table => {
    table.bigincrements('id').primary()
    table
      .bigInteger('userId')
      .notNullable()
      .index()
    table.foreign('userId').references('users.id')
    table
      .bigInteger('repositoryId')
      .notNullable()
      .index()
    table.foreign('repositoryId').references('repositories.id')
    table.dateTime('createdAt').notNullable()
    table.dateTime('updatedAt').notNullable()
    table.unique(['userId', 'repositoryId'])
  })

exports.down = knex => knex.schema.dropTableIfExists('user_repository_rights')
