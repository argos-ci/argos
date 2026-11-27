const TYPES = ["trial", "cancellation"];
const ENTERPRISE_TYPES = ["enterprise_offer", "enterprise_renewal"];

/**
 * @param {string[]} types
 */
function typeCheck(types) {
  return `CHECK (type = ANY (ARRAY[${types.map((type) => `'${type}'::text`).join(", ")}]))`;
}

/**
 * The Enterprise offer emailed to a Pro team, and the renewal email of an
 * annual Enterprise contract, as outreach. Both are about a subscription.
 * The offer is made once per Pro subscription; a renewal email goes out every
 * term, so it has no unique index.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(`
    ALTER TABLE team_outreach DROP CONSTRAINT team_outreach_type_check
  `);
  await knex.raw(`
    ALTER TABLE team_outreach ADD CONSTRAINT team_outreach_type_check
    ${typeCheck([...TYPES, ...ENTERPRISE_TYPES])}
  `);
  await knex.raw(`
    ALTER TABLE team_outreach
    ADD CONSTRAINT team_outreach_enterprise_subscription
    CHECK (type NOT IN ('enterprise_offer', 'enterprise_renewal') OR "subscriptionId" IS NOT NULL)
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX team_outreach_enterprise_offer_unique
    ON team_outreach ("subscriptionId") WHERE type = 'enterprise_offer'
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`DROP INDEX team_outreach_enterprise_offer_unique`);
  await knex.raw(`
    ALTER TABLE team_outreach
    DROP CONSTRAINT team_outreach_enterprise_subscription
  `);
  await knex("team_outreach").whereIn("type", ENTERPRISE_TYPES).delete();
  await knex.raw(`
    ALTER TABLE team_outreach DROP CONSTRAINT team_outreach_type_check
  `);
  await knex.raw(`
    ALTER TABLE team_outreach ADD CONSTRAINT team_outreach_type_check
    ${typeCheck(TYPES)}
  `);
};
