/**
 * Let a comment target a test instead of a build.
 *
 * `buildId` becomes nullable and a `testId` joins it: a comment is posted either
 * on a build (the existing behaviour) or on a test, never on both and never on
 * neither. Test comments are plain discussion threads, so the build-only
 * columns (`buildReviewId`, `screenshotDiffId`) must stay null on them — a
 * review draft or a diff anchor has no meaning outside a build.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("comments", (table) => {
    table.bigInteger("buildId").nullable().alter();

    table.bigInteger("testId");
    table.foreign("testId").references("tests.id").onDelete("CASCADE");
    table.index(["testId", "createdAt"]);
  });

  await knex.raw(`
    ALTER TABLE comments
    ADD CONSTRAINT comments_target_xor
    CHECK (num_nonnulls("buildId", "testId") = 1);
  `);

  await knex.raw(`
    ALTER TABLE comments
    ADD CONSTRAINT comments_test_target_scope
    CHECK (
      "testId" IS NULL
      OR ("buildReviewId" IS NULL AND "screenshotDiffId" IS NULL)
    );
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(
    `ALTER TABLE comments DROP CONSTRAINT comments_test_target_scope;`,
  );
  await knex.raw(`ALTER TABLE comments DROP CONSTRAINT comments_target_xor;`);

  await knex("comments").whereNull("buildId").delete();

  await knex.schema.alterTable("comments", (table) => {
    table.dropColumn("testId");
    table.bigInteger("buildId").notNullable().alter();
  });
};
