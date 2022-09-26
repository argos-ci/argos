const now = new Date();

exports.up = async (knex) => {
  const organizationWithoutAccounts = await knex("organizations")
    .select("organizations.id")
    .leftOuterJoin("accounts", "organizations.id", "accounts.organizationId")
    .whereNull("accounts.id");

  const userWithoutAccounts = await knex("users")
    .select("users.id")
    .leftOuterJoin("accounts", "users.id", "accounts.organizationId")
    .whereNull("accounts.id");

  await knex("accounts").insert([
    ...organizationWithoutAccounts.map(({ id }) => ({
      createdAt: now,
      updatedAt: now,
      organizationId: id,
    })),
    ...userWithoutAccounts.map(({ id }) => ({
      createdAt: now,
      updatedAt: now,
      userId: id,
    })),
  ]);
};

exports.down = async () => {};
