/**
 * Record which coding agent posted a comment, when one did.
 *
 * An agent acts with its user's own credentials, so a comment it writes is
 * indistinguishable from one the person typed. This is what lets the UI say
 * "posted through Claude Code" next to the author's avatar, rather than
 * silently attributing the agent's words to them.
 *
 * A plain string, not a foreign key: the value is an id from the curated
 * registry in `src/agent/registry.ts` (or `unknown` for an agent we can't put a
 * name to), which lives in code because adding an agent is a display decision,
 * not data anyone edits. `NULL` means a person acted directly.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("comments", (table) => {
    table.string("agent");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("comments", (table) => {
    table.dropColumn("agent");
  });
};
