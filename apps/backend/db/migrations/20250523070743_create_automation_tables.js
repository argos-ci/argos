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
    table
      .bigInteger("projectId")
      .notNullable()
      .references("id")
      .inTable("projects");
    table.jsonb("on").notNullable().defaultTo("[]");
    table.jsonb("if").notNullable();
    table.jsonb("then").notNullable().defaultTo("[]");
    table.index("projectId");
  });

  await knex.schema.createTable("automation_runs", (table) => {
    table.bigIncrements("id").primary();
    table.timestamp("createdAt").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt").notNullable().defaultTo(knex.fn.now());
    table
      .bigInteger("automationRuleId")
      .notNullable()
      .references("id")
      .inTable("automation_rules");
    table.string("event").notNullable();
    table.bigInteger("buildId").nullable().references("id").inTable("builds");
    table.index("automationRuleId");
    table.index("buildId");
  });

  await knex.schema.createTable("automation_action_runs", (table) => {
    table.bigIncrements("id").primary();
    table.timestamp("createdAt").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updatedAt").notNullable().defaultTo(knex.fn.now());
    table.string("jobStatus").notNullable().defaultTo("pending");
    table.string("conclusion").nullable();
    table.text("failureReason").nullable();
    table.integer("attempts").notNullable().defaultTo(0);
    table
      .bigInteger("automationRunId")
      .notNullable()
      .references("id")
      .inTable("automation_runs");
    table.string("action").notNullable();
    table.jsonb("actionPayload").notNullable();
    table.timestamp("processedAt").nullable();
    table.timestamp("completedAt").nullable();
    table.index("automationRunId");
    table.index("jobStatus");
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
