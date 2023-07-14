/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("purchases", async (table) => {
    table.string("stripeSubscriptionId").unique();
  });

  const mapping = [
    {
      stripeSubscriptionId: "sub_1NT7iGHOD9RpIFZdFnt7knU9",
      id: "465",
    },
    {
      stripeSubscriptionId: "sub_1NSLRBHOD9RpIFZd6Dx7jgM9",
      id: "463",
    },
    {
      stripeSubscriptionId: "sub_1NGsUrHOD9RpIFZdDfmLwfrh",
      id: "429",
    },
    {
      stripeSubscriptionId: "sub_1NC323HOD9RpIFZddZ81OdfN",
      id: "423",
    },
    {
      stripeSubscriptionId: "sub_1MqenPHOD9RpIFZd6eakCSxV",
      id: "418",
    },
    {
      stripeSubscriptionId: "sub_1MMCkUHOD9RpIFZdk4XEIZBy",
      id: "182",
    },
    {
      stripeSubscriptionId: "sub_1NFtAiHOD9RpIFZdS8e0B9C8",
      id: "425",
    },
    {
      stripeSubscriptionId: "sub_1N9pS6HOD9RpIFZd2QJ8gkrN",
      id: "420",
    },
  ];

  for (const { stripeSubscriptionId, id } of mapping) {
    await knex("purchases").update({ stripeSubscriptionId }).where({ id });
  }

  await knex.raw(`ALTER TABLE purchases
  ADD CONSTRAINT check_stripe_subscription
  CHECK ((source <> 'stripe') OR ("stripeSubscriptionId" IS NOT NULL))`);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`ALTER TABLE purchases
  DROP CONSTRAINT check_stripe_subscription`);

  await knex.schema.alterTable("purchases", async (table) => {
    table.dropColumn("stripeSubscriptionId");
  });
};
