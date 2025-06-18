/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("slack_installations", (table) => {
    table.dateTime("connectedAt");
  });

  await knex.raw(`
    UPDATE slack_installations
    SET "connectedAt" = "createdAt"
    WHERE "connectedAt" IS NULL`);

  await knex.raw(`
    ALTER TABLE slack_installations
    ALTER COLUMN "connectedAt" SET NOT NULL`);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("slack_installations", (table) => {
    table.dropColumn("connectedAt");
  });
};
