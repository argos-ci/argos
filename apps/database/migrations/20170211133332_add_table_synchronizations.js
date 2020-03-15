exports.up = knex =>
  knex.schema.createTable('synchronizations', table => {
    table.bigincrements('id').primary()
    table
      .bigInteger('userId')
      .notNullable()
      .index()
    table.foreign('userId').references('users.id')
    table
      .string('jobStatus')
      .notNullable()
      .index()
    table
      .string('type')
      .notNullable()
      .index()
    table.dateTime('createdAt').notNullable()
    table.dateTime('updatedAt').notNullable()
  })

exports.down = knex => knex.schema.dropTableIfExists('synchronizations')
