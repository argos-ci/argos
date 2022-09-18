exports.up = async (knex) => {
  const referenceBuildIds = knex("builds")
    .select("builds.id")
    .innerJoin("repositories", "builds.repositoryId", "repositories.id")
    .innerJoin(
      "screenshot_buckets",
      "builds.compareScreenshotBucketId",
      "screenshot_buckets.id"
    )
    .whereNull("builds.type")
    .where((query) =>
      query
        .where((builder) =>
          builder
            .whereNotNull("repositories.baselineBranch")
            .whereRaw('"branch" = "baselineBranch"')
        )
        .orWhere((builder) =>
          builder
            .whereNull("repositories.baselineBranch")
            .whereRaw('"branch" = "defaultBranch"')
        )
    );

  await knex("builds")
    .update("type", "reference")
    .whereIn("id", referenceBuildIds);

  await knex("builds").whereNull("type").update("type", "check");
};

exports.down = async () => {};
