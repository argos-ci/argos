const now = new Date();

/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  const [missingOrganizationAccounts, missingUserAccounts] = await Promise.all([
    knex("organizations")
      .select("organizations.id")
      .distinct()
      .leftOuterJoin("accounts", "organizations.id", "accounts.organizationId")
      .whereNull("accounts.id"),

    knex("users")
      .select("users.id")
      .distinct()
      .leftOuterJoin("accounts", "users.id", "accounts.userId")
      .whereNull("accounts.id"),
  ]);

  if (missingOrganizationAccounts.length + missingUserAccounts.length === 0) {
    return;
  }

  await knex("accounts").insert([
    ...missingOrganizationAccounts.map(({ id }) => ({
      createdAt: now,
      updatedAt: now,
      organizationId: id,
    })),
    ...missingUserAccounts.map(({ id }) => ({
      createdAt: now,
      updatedAt: now,
      userId: id,
    })),
  ]);
};

/**
 * @param {import('knex').Knex} knex
 */
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
export const down = async (knex) => {};
