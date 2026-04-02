const getGithubPullRequestIdType = async (knex) => {
  const result = await knex("information_schema.columns")
    .select("data_type")
    .where({
      table_schema: "public",
      table_name: "github_pull_requests",
      column_name: "id",
    })
    .first();

  return result?.data_type ?? null;
};

export const up = async (knex) => {
  const dataType = await getGithubPullRequestIdType(knex);

  if (dataType === "bigint") {
    return;
  }

  await knex.raw(
    "ALTER TABLE github_pull_requests ALTER COLUMN id TYPE BIGINT",
  );
};

export const down = async (knex) => {
  const dataType = await getGithubPullRequestIdType(knex);

  if (dataType === "integer") {
    return;
  }

  await knex.raw(
    "ALTER TABLE github_pull_requests ALTER COLUMN id TYPE INTEGER",
  );
};
