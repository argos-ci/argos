exports.up = async (knex) => {
  await knex.schema.table("accounts", (table) => {
    table.bigInteger("forcedPlanId").index();
    table.foreign("forcedPlanId").references("plans.id");
  });
};

exports.down = async (knex) => {
  await knex.schema.table("accounts", (table) => {
    table.dropColumn("forcedPlanId");
  });
};
