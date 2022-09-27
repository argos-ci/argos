const now = new Date();

exports.up = async (knex) => {
  await knex.schema.alterTable("accounts", async (table) => {
    table.bigInteger("userId").unique().alter();
    table.bigInteger("organizationId").unique().alter();
  });

  const [missingOrganizationAccounts, missingUserAccounts] = await Promise.all([
    knex("repositories")
      .select("repositories.organizationId")
      .distinct()
      .whereNotNull("repositories.organizationId")
      .leftOuterJoin(
        "accounts",
        "repositories.organizationId",
        "accounts.organizationId"
      )
      .whereNull("accounts.id"),

    knex("repositories")
      .select("repositories.userId")
      .distinct()
      .whereNotNull("repositories.userId")
      .leftOuterJoin("accounts", "repositories.userId", "accounts.userId")
      .whereNull("accounts.id"),
  ]);

  await knex("accounts").insert([
    ...missingOrganizationAccounts.map(({ organizationId }) => ({
      createdAt: now,
      updatedAt: now,
      organizationId,
    })),
    ...missingUserAccounts.map(({ userId }) => ({
      createdAt: now,
      updatedAt: now,
      userId,
    })),
  ]);
};

exports.down = async (knex) => {
  await knex.schema.alterTable("accounts", function (table) {
    table.dropUnique("userId");
    table.dropUnique("organizationId");
  });
};
