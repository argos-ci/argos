/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  // -- subscriptions
  await knex.schema.createTable("subscriptions", (table) => {
    table.bigIncrements("id").primary();

    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();

    table.integer("planId").index().notNullable();
    table.foreign("planId").references("plans.id");

    table.enum("provider", ["stripe", "github"]).notNullable();
    table.string("stripeSubscriptionId").unique();

    table.integer("accountId").index().notNullable();
    table.foreign("accountId").references("accounts.id");

    table.integer("subscriberId").index();
    table.foreign("subscriberId").references("users.id");

    table.dateTime("startDate").notNullable();
    table.dateTime("endDate");
    table.dateTime("trialEndDate");
    table.boolean("paymentMethodFilled");
    table.string("status").notNullable();
  });

  await knex.raw(
    `ALTER TABLE "subscriptions"
    ADD CONSTRAINT "check_stripe_fields"
    CHECK (
      "provider" != 'stripe' OR
      ("stripeSubscriptionId" IS NOT NULL AND "subscriberId" IS NOT NULL)
    )`,
  );

  // copy purchases to subscriptions
  await knex.raw(
    `INSERT INTO subscriptions ("id", "createdAt", "updatedAt", "planId", "provider", "accountId", "subscriberId", "startDate", "endDate", "trialEndDate", "paymentMethodFilled", "stripeSubscriptionId", "status")
    SELECT purchases."id", purchases."createdAt", purchases."updatedAt", purchases."planId", purchases."source", purchases."accountId", purchases."purchaserId", purchases."startDate", purchases."endDate", purchases."trialEndDate", purchases."paymentMethodFilled", purchases."stripeSubscriptionId", purchases."status"
    FROM purchases`,
  );

  // update subscriptions autoincrement
  await knex.raw(
    `select setval('"subscriptions_id_seq"', (SELECT MAX(id) FROM subscriptions))`,
  );

  await knex.schema.dropTable("purchases");

  // -- plans
  await knex.schema.alterTable("plans", (table) => {
    table.renameColumn("stripePlanId", "stripeProductId");
    table.renameColumn("githubId", "githubPlanId");
  });
};

export const down = async () => {
  throw new Error("There is no way to go back from hell 😈");
};
