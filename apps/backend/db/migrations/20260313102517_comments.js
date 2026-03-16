/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("comments", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());
    table.bigInteger("userId").notNullable();
    table.foreign("userId").references("users.id");

    table.bigInteger("buildId").notNullable();
    table.foreign("buildId").references("builds.id").onDelete("CASCADE");

    table.bigInteger("buildReviewId");
    table
      .foreign("buildReviewId")
      .references("build_reviews.id")
      .onDelete("CASCADE");

    table.bigInteger("threadId");
    table.foreign("threadId").references("comments.id").onDelete("CASCADE");

    table.jsonb("content").notNullable();

    table.index(["buildId", "createdAt"]);
  });

  await knex.schema.createTable("comment_reactions", (table) => {
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());
    table.bigInteger("commentId").notNullable();
    table.foreign("commentId").references("comments.id").onDelete("CASCADE");
    table.bigInteger("userId").notNullable();
    table.foreign("userId").references("users.id");
    table.string("emoji").notNullable();
    table.primary(["commentId", "userId", "emoji"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTable("comment_reactions");
  await knex.schema.dropTable("comments");
};
