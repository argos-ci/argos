const CONSTRAINTS = [
  {
    table: "team_users",
    column: "userLevel",
    constraint: "team_users_userLevel_check",
  },
  {
    table: "team_invites",
    column: "userLevel",
    constraint: "team_invites_userLevel_check",
  },
  {
    table: "team_scim_users",
    column: "role",
    constraint: "team_scim_users_role_check",
  },
];

/**
 * @param {import('knex').Knex} knex
 * @param {string[]} levels
 */
async function setAllowedLevels(knex, levels) {
  const values = levels.map((level) => `'${level}'::text`).join(", ");
  for (const { table, column, constraint } of CONSTRAINTS) {
    await knex.raw(`
      ALTER TABLE "${table}"
      DROP CONSTRAINT "${constraint}",
      ADD CONSTRAINT "${constraint}"
      CHECK ("${column}" = ANY (ARRAY[${values}]))
    `);
  }
}

/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await setAllowedLevels(knex, ["owner", "billing", "member", "contributor"]);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  for (const { table, column } of CONSTRAINTS) {
    await knex(table)
      .where(column, "billing")
      .update({ [column]: "member" });
  }
  await setAllowedLevels(knex, ["owner", "member", "contributor"]);
};
