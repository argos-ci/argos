/**
 * A GitHub Marketplace purchase made for a team the buyer already owned was
 * attached to that team without linking it to the purchasing organization, so
 * every later `changed` and `cancelled` event for it was dropped. Link those
 * teams now: the purchasing organization is the one their projects live in,
 * which is how the purchase picked the team. A team whose projects span
 * several organizations, or whose organization is already linked elsewhere,
 * is left alone rather than guessed.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(`
    WITH candidates AS (
      SELECT
        team.id AS "accountId",
        min(repository."githubAccountId") AS "githubAccountId"
      FROM accounts team
      JOIN projects project
        ON project."accountId" = team.id AND project."deletedAt" IS NULL
      JOIN github_repositories repository
        ON repository.id = project."githubRepositoryId"
      WHERE team."teamId" IS NOT NULL
        AND team."githubAccountId" IS NULL
        AND EXISTS (
          SELECT 1 FROM subscriptions subscription
          WHERE subscription."accountId" = team.id
            AND subscription.provider = 'github'
            AND subscription.status = 'active'
            AND subscription."endDate" IS NULL
        )
      GROUP BY team.id
      HAVING count(DISTINCT repository."githubAccountId") = 1
    )
    UPDATE accounts
    SET "githubAccountId" = candidates."githubAccountId"
    FROM candidates
    JOIN github_accounts organization
      ON organization.id = candidates."githubAccountId"
      AND organization.type = 'organization'
    WHERE accounts.id = candidates."accountId"
      AND NOT EXISTS (
        SELECT 1 FROM accounts linked
        WHERE linked."githubAccountId" = candidates."githubAccountId"
      )
      AND (
        SELECT count(*) FROM candidates other
        WHERE other."githubAccountId" = candidates."githubAccountId"
      ) = 1
  `);
};

/**
 * Teams linked by the purchase itself cannot be told apart from the ones
 * linked here, so there is nothing safe to undo.
 */
export const down = async () => {};
