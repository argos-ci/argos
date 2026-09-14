/**
 * Slugs were built from the raw project name and account slug, so a deployment
 * stored as `OKC-…-GitbookIO` was looked up as `okc-…-gitbookio`, the form
 * every link to it already had, and never found. Two rows folding to the same
 * slug would trip `deployments_slug_unique` and abort here rather than merge.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(
    `UPDATE deployments SET slug = lower(slug) WHERE slug <> lower(slug)`,
  );
};

/**
 * The original casing is not recoverable, and the lowercase form is the one
 * every link shows, so there is nothing to put back.
 */
export const down = async () => {};
