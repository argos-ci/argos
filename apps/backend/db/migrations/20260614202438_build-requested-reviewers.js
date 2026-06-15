/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable("build_requested_reviewers", (table) => {
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());

    table.bigInteger("buildId").notNullable();
    table.foreign("buildId").references("builds.id").onDelete("CASCADE");

    table.bigInteger("userId").notNullable();
    table.foreign("userId").references("users.id").onDelete("CASCADE");

    table.bigInteger("requestedById");
    table.foreign("requestedById").references("users.id").onDelete("SET NULL");

    table.primary(["buildId", "userId"]);

    table.index("userId");
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTable("build_requested_reviewers");
}
