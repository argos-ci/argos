exports.up = async (knex) => {
  await knex.schema.table("purchases", (table) => {
    table.dateTime("startDate").defaultTo(knex.fn.now());
    table.dateTime("endDate");
  });
  await knex.schema.alterTable("plans", (table) => {
    table.integer("githubId").notNullable().index().alter();
  });
};

exports.down = async (knex) => {
  await knex.schema.table("purchases", (table) => {
    table.dropColumn("startDate");
    table.dropColumn("endDate");
  });
  await knex.schema.alterTable("plans", (table) => {
    table.dropIndex("githubId");
    table.string("githubId").notNullable().alter();
  });
};
