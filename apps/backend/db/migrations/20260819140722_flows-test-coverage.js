/**
 * The end-to-end tests of a project, and what each build did with them.
 *
 * Until now Argos only ever heard about a test that took a screenshot: the
 * screenshot arrived carrying its test in `metadata`, and a test that captured
 * nothing was, from here, indistinguishable from a test that did not exist. So
 * "this test has no visual coverage" was not a sentence the product could say —
 * there was no denominator. The test runner's report has it, and these two
 * tables are where it lands.
 *
 * `flows` is the identity of a test across builds; `flow_runs` is one execution
 * of it in one build. The split is the same one `tests` / `screenshots` already
 * makes, for the same reason: the identity outlives the run, and the run is
 * what carries a status and a duration.
 *
 * A *flow* deliberately ignores the test runner project (chromium, firefox, a
 * device): the same test walked under three browsers is one journey seen three
 * times, not three journeys. The browser lives on the run, which mirrors how
 * `variantKey` already collapses the browser and viewport variants of a
 * screenshot.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("flows", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();

    table.bigInteger("projectId").notNullable();
    table.foreign("projectId").references("projects.id").onDelete("cascade");

    // Scoped by build name like `tests`, because a project with several build
    // names runs several suites that know nothing about each other.
    table.string("buildName").notNullable();

    // The test's identity: its title path joined, starting at the file
    // (`tests/checkout.spec.ts > checkout > applies a coupon`). Derived from
    // the report rather than sent by it, so the rule lives in one place.
    table.string("key", 1024).notNullable();

    // Kept alongside `key` so the UI can group by file and link to the source
    // without re-parsing the key, and so a file rename is visible as such.
    table.string("file", 1024).notNullable();
    table.string("title", 1024).notNullable();
    table.jsonb("titlePath").notNullable();

    // A test deleted from the suite stops appearing in reports but keeps its
    // rows, so its history survives. This is how "still in the suite" is
    // answered without keeping a boolean in sync.
    table.dateTime("lastSeenAt").notNullable();

    table.unique(["projectId", "buildName", "key"]);
  });

  await knex.schema.createTable("flow_runs", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();

    table.bigInteger("buildId").notNullable();
    table.foreign("buildId").references("builds.id").onDelete("cascade");
    table.bigInteger("flowId").notNullable();
    table.foreign("flowId").references("flows.id").onDelete("cascade");

    // Which shard reported it, when the build was split. Null for single
    // builds; set null rather than cascade, because losing the shard must not
    // lose the run.
    table.bigInteger("buildShardId");
    table
      .foreign("buildShardId")
      .references("build_shards.id")
      .onDelete("set null");

    // The test runner project: a browser or a device. Empty string when the
    // runner has none configured, which is also what Playwright reports, so the
    // unique index below stays usable — a nullable column would let the same
    // run be inserted twice, since Postgres counts nulls as distinct.
    table.string("pwProject").notNullable().defaultTo("");

    // The runner's own test id. Screenshots carry it in
    // `metadata.test.id`, which is how they find their run without matching
    // titles.
    table.string("pwTestId");

    table.string("status", 24).notNullable();
    table.string("outcome", 24);
    table.integer("duration");
    table.integer("retry");
    table.integer("line");
    table.jsonb("tags");
    table.jsonb("annotations");

    // One run per (build, flow, runner project). Makes the ingestion
    // idempotent: a retried upload of the same shard writes the same rows.
    table.unique(["buildId", "flowId", "pwProject"]);

    // Rates are read per flow over a window of builds, so the flow leads.
    table.index(["flowId", "createdAt"]);

    // Screenshots are attached by looking runs up per build.
    table.index(["buildId", "pwTestId"]);
  });

  await knex.schema.alterTable("screenshots", (table) => {
    // The run that took this screenshot. Nullable for everything Argos already
    // stores and for every SDK that sends no report; set null on delete so
    // purging a build's runs never takes its screenshots with it.
    table.bigInteger("flowRunId");
    table.foreign("flowRunId").references("flow_runs.id").onDelete("set null");
    table.index(["flowRunId"]);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("screenshots", (table) => {
    table.dropColumn("flowRunId");
  });
  await knex.schema.dropTable("flow_runs");
  await knex.schema.dropTable("flows");
};
