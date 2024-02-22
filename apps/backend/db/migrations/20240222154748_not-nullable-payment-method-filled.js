/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.raw(
    'ALTER TABLE subscriptions ALTER COLUMN "paymentMethodFilled" SET NOT NULL',
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.raw(
    'ALTER TABLE subscriptions ALTER COLUMN "paymentMethodFilled" DROP NOT NULL',
  );
};
