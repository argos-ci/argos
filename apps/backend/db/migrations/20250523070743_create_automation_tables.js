/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable("automation_rules", (table) => {
    table.bigIncrements("id").primary();
    table.timestamp("createdAt").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt").notNullable().defaultTo(knex.fn.now());
    table.boolean("active").notNullable().defaultTo(true);
    table.string("name").notNullable();
    table.bigInteger("projectId").notNullable().references("projects.id");
    table.jsonb("on").notNullable().defaultTo("[]");
    table.jsonb("if").notNullable();
    table.jsonb("then").notNullable().defaultTo("[]");
  });

  await knex.schema.createTable("automation_runs", (table) => {
    table.bigIncrements("id").primary();
    table.timestamp("createdAt").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt").notNullable().defaultTo(knex.fn.now());
    table.string("jobStatus").notNullable();
    table.index("automationRuleId");
    table
      .bigInteger("automationRuleId")
      .notNullable()
      .references("automation_rules.id");
    table.string("event").notNullable();
    table.bigInteger("buildId").nullable().references("builds.id");
    table.bigInteger("buildReviewId").nullable().references("build_reviews.id");
  });

  await knex.schema.createTable("automation_action_runs", (table) => {
    table.bigIncrements("id").primary();
    table.timestamp("createdAt").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt").notNullable().defaultTo(knex.fn.now());

    table.string("jobStatus").notNullable();
    table.string("conclusion").nullable();
    table.text("failureReason").nullable();
    table.index("automationRunId");
    table
      .bigInteger("automationRunId")
      .notNullable()
      .references("automation_runs.id");
    table.string("action").notNullable();
    table.jsonb("actionPayload").notNullable();
    table.timestamp("processedAt").nullable();
    table.timestamp("completedAt").nullable();
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("automation_action_runs");
  await knex.schema.dropTableIfExists("automation_runs");
  await knex.schema.dropTableIfExists("automation_rules");
}
