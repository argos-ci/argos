/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("user_emails", (table) => {
    table.string("email").notNullable();
    table.boolean("verified").notNullable().defaultTo(false);
    table.bigInteger("userId").notNullable();
    table.foreign("userId").references("users.id").onDelete("cascade");
    table.primary(["email"]);
  });

  await knex.raw(`
    -- 1 seed from users.email
    INSERT INTO user_emails (email, "verified", "userId")
    SELECT DISTINCT u.email, TRUE, u.id
    FROM users u
    WHERE u.email IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_emails ue
        WHERE LOWER(ue.email) = LOWER(u.email)
      );

    -- 2 add gitlab email if the user has a gitlabUserId and email not already linked
    INSERT INTO user_emails (email, "verified", "userId")
    SELECT DISTINCT gu.email, TRUE, u.id
    FROM users u
    JOIN gitlab_users gu ON gu.id = u."gitlabUserId"
    WHERE u."gitlabUserId" IS NOT NULL
      AND gu.email IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_emails ue
        WHERE LOWER(ue.email) = LOWER(gu.email)
      );

    -- 3 add google email if the user has a googleUserId and email not already linked
    INSERT INTO user_emails (email, "verified", "userId")
    SELECT DISTINCT gou."primaryEmail", TRUE, u.id
    FROM users u
    JOIN google_users gou ON gou.id = u."googleUserId"
    WHERE u."googleUserId" IS NOT NULL
      AND gou."primaryEmail" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_emails ue
        WHERE LOWER(ue.email) = LOWER(gou."primaryEmail")
      );

    -- 4 add github email if the user has a github account and email not already linked
    INSERT INTO user_emails (email, "verified", "userId")
    SELECT DISTINCT ga.email, TRUE, u.id
    FROM users u
    JOIN accounts a ON a."userId" = u.id
    JOIN github_accounts ga ON ga.id = a."githubAccountId"
    WHERE ga.email IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_emails ue
        WHERE LOWER(ue.email) = LOWER(ga.email)
      );
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTable("user_emails");
};
