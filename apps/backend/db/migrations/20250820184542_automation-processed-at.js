/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(
    `update automation_action_runs set "processedAt" = "completedAt"`,
  );
};

export const down = async () => {};
