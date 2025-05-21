exports.up = async (knex) => {
  await knex.schema.createTable('project_slack_notification_settings', (table) => {
    table.bigIncrements('id').primary();
    table
      .bigInteger('projectId')
      .notNullable()
      .references('id')
      .inTable('projects')
      .onDelete('CASCADE')
      .index();
    table
      .bigInteger('slackInstallationId')
      .notNullable()
      .references('id')
      .inTable('slack_installations')
      .onDelete('CASCADE')
      .index();
    table.string('channelId').notNullable();
    table
      .string('notificationType')
      .notNullable()
      .defaultTo('all_changes'); // 'all_changes' or 'reference_changes'
    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('project_slack_notification_settings');
};
