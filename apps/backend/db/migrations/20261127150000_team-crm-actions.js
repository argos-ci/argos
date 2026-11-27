/**
 * What staff do with a customer, one row per action with its type, instead of
 * a table or a column per staff page.
 *
 * The trial outreach of `staff_team_contacts` and the cancellation follow-up
 * of `subscriptions."staffContactedAt"` are copied over and left in place:
 * tasks still running the previous release read them until the deploy
 * finishes. They are dropped in a later migration.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("team_crm_actions", (table) => {
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
    table
      .enum("type", ["trial_outreach", "cancellation_follow_up"])
      .notNullable();
    table.text("note");
  });

  // A follow-up is about one cancellation, so it names its subscription.
  await knex.raw(`
    ALTER TABLE team_crm_actions
    ADD CONSTRAINT team_crm_actions_cancellation_follow_up_subscription
    CHECK (type <> 'cancellation_follow_up' OR "subscriptionId" IS NOT NULL)
  `);
  // The staff pages mark these once: once per team for the trial outreach,
  // once per subscription for the cancellation follow-up.
  await knex.raw(`
    CREATE UNIQUE INDEX team_crm_actions_trial_outreach_unique
    ON team_crm_actions ("teamId") WHERE type = 'trial_outreach'
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX team_crm_actions_cancellation_follow_up_unique
    ON team_crm_actions ("subscriptionId") WHERE type = 'cancellation_follow_up'
  `);

  await knex.raw(`
    INSERT INTO team_crm_actions ("createdAt", "updatedAt", "teamId", "userId", type)
    SELECT "createdAt", "updatedAt", "teamId", "userId", 'trial_outreach'
    FROM staff_team_contacts
  `);
  // The cancellation mark never recorded who wrote: its author stays unknown.
  await knex.raw(`
    INSERT INTO team_crm_actions ("createdAt", "updatedAt", "teamId", "subscriptionId", type)
    SELECT s."staffContactedAt", s."staffContactedAt", a."teamId", s.id, 'cancellation_follow_up'
    FROM subscriptions s
    JOIN accounts a ON a.id = s."accountId"
    WHERE s."staffContactedAt" IS NOT NULL AND a."teamId" IS NOT NULL
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("team_crm_actions");
};
