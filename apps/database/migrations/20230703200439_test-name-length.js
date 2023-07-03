/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.raw(`ALTER TABLE tests ALTER COLUMN name TYPE varchar(1024)`);
  await knex.raw(
    `ALTER TABLE screenshots ALTER COLUMN name TYPE varchar(1024)`
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.raw(`ALTER TABLE tests ALTER COLUMN name TYPE varchar(255)`);
  await knex.raw(`ALTER TABLE screenshots ALTER COLUMN name TYPE varchar(255)`);
};
