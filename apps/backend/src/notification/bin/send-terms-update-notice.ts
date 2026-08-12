#!/usr/bin/env node
import { callbackify } from "node:util";

import { Account, TeamUser, User } from "@/database/models";
import logger from "@/logger";
import { sendNotification } from "@/notification";

/**
 * Date the new terms take effect for existing paid subscriptions. It must match
 * the date published in the terms themselves, and the terms promise thirty
 * days' notice, so shifting the send date means shifting both.
 */
const EFFECTIVE_DATE = "2026-09-11";

/**
 * Users who own an account. A personal account is owned by its user, and a team
 * account by its `owner` members. Those are the people who accepted the terms
 * on behalf of the customer, which is who section 28 owes notice to.
 *
 * Users without an email address are left out: the message job skips them
 * anyway, and counting them would overstate the reach of the notice.
 */
async function getAccountOwnerIds(): Promise<string[]> {
  const users = await User.query()
    .select("users.id")
    .whereNotNull("users.email")
    .where((builder) => {
      builder
        .whereIn(
          "users.id",
          Account.query().select("accounts.userId").whereNotNull("userId"),
        )
        .orWhereIn(
          "users.id",
          TeamUser.query()
            .select("team_users.userId")
            .join("accounts", "accounts.teamId", "team_users.teamId")
            .where("team_users.userLevel", "owner"),
        );
    });
  return users.map((user) => user.id);
}

const main = callbackify(async () => {
  const recipients = await getAccountOwnerIds();
  logger.info(`${recipients.length} account owners resolved`);

  // Emailing the whole customer base is not something a stray run should do.
  if (!process.argv.includes("--send")) {
    logger.info("Dry run. Re-run with --send to queue the notification.");
    return;
  }

  await sendNotification({
    type: "terms_updated",
    data: { effectiveDate: EFFECTIVE_DATE },
    recipients,
  });
  logger.info(`Notification queued for ${recipients.length} recipients`);
});

main((err) => {
  if (err) {
    throw err;
  }
});
