/**
 * The emails staff send a team, one row per email with its type, instead of a
 * table or a column per staff page.
 *
 * The trial outreach of `staff_team_contacts` and the cancellation follow-up
 * of `subscriptions."staffContactedAt"` are copied over and left in place:
 * tasks still running the previous release read them until the deploy
 * finishes. They are dropped in a later migration.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("team_outreach", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("teamId").unsigned().notNullable().index();
    table.foreign("teamId").references("teams.id").onDelete("cascade");
    // The history outlives the staff member who wrote it.
    table.bigInteger("userId").unsigned();
    table.foreign("userId").references("users.id").onDelete("set null");
    table.bigInteger("subscriptionId").unsigned();
    table
      .foreign("subscriptionId")
      .references("subscriptions.id")
      .onDelete("cascade");
    table.enum("type", ["trial", "cancellation"]).notNullable();
    table.text("note");
  });

  // A follow-up is about one cancellation, so it names its subscription.
  await knex.raw(`
    ALTER TABLE team_outreach
    ADD CONSTRAINT team_outreach_cancellation_subscription
    CHECK (type <> 'cancellation' OR "subscriptionId" IS NOT NULL)
  `);
  // The staff pages mark these once: once per team for the trial outreach,
  // once per subscription for the cancellation follow-up.
  await knex.raw(`
    CREATE UNIQUE INDEX team_outreach_trial_unique
    ON team_outreach ("teamId") WHERE type = 'trial'
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX team_outreach_cancellation_unique
    ON team_outreach ("subscriptionId") WHERE type = 'cancellation'
  `);

  await knex.raw(`
    INSERT INTO team_outreach ("createdAt", "updatedAt", "teamId", "userId", type)
    SELECT "createdAt", "updatedAt", "teamId", "userId", 'trial'
    FROM staff_team_contacts
  `);
  // The cancellation mark never recorded who wrote: its author stays unknown.
  await knex.raw(`
    INSERT INTO team_outreach ("createdAt", "updatedAt", "teamId", "subscriptionId", type)
    SELECT s."staffContactedAt", s."staffContactedAt", a."teamId", s.id, 'cancellation'
    FROM subscriptions s
    JOIN accounts a ON a.id = s."accountId"
    WHERE s."staffContactedAt" IS NOT NULL AND a."teamId" IS NOT NULL
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("team_outreach");
};
