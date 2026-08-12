#!/usr/bin/env node
import { knex } from "@/database";
import { Plan, Subscription, TeamUser, User } from "@/database/models";
import { quitAmqp } from "@/job-core/amqp";
import { sendNotification } from "@/notification";

/**
 * Date the new terms take effect for existing paid subscriptions. It must match
 * the date published in the terms themselves, and the terms promise thirty
 * days' notice, so shifting the send date means shifting both.
 */
const EFFECTIVE_DATE = "2026-09-11";

/**
 * Owners of a team on a paid plan. They are the people who accepted the terms
 * on behalf of the organization, which is the "Customer" section 28 owes
 * notice to. Personal accounts and free teams are out of scope.
 *
 * "Paid" mirrors what the app computes in `Account.$getSubscriptionManager`:
 * an active subscription on a plan other than `free`, or a plan granted
 * internally through `accounts.forcedPlanId`. The second case matters because
 * a forced plan short-circuits the subscription lookup, so those accounts have
 * no subscription row at all and a subscription-only check would read them as
 * free.
 *
 * Addressing goes through `users.email`, like every other notification: the
 * `user_emails` table records which addresses belong to a user, for domain
 * auto-join and invite matching, and is not a delivery list. Users without an
 * email are left out, since the message job skips them anyway and counting
 * them would overstate the reach of the notice.
 */
async function getPayingTeamOwnerIds(): Promise<string[]> {
  const users = await User.query()
    .select("users.id")
    .whereNotNull("users.email")
    .whereIn(
      "users.id",
      TeamUser.query()
        .select("team_users.userId")
        .join("accounts", "accounts.teamId", "team_users.teamId")
        .where("team_users.userLevel", "owner")
        .where((builder) => {
          builder
            .whereExists(
              Subscription.query()
                .joinRelated("plan")
                .whereRaw('subscriptions."accountId" = accounts.id')
                .whereRaw('subscriptions."startDate" < now()')
                .whereIn("subscriptions.status", [
                  "active",
                  "trialing",
                  "past_due",
                ])
                .where((qb) =>
                  qb
                    .whereNull("subscriptions.endDate")
                    .orWhereRaw('subscriptions."endDate" >= now()'),
                )
                .whereNot("plan.name", "free"),
            )
            .orWhereExists(
              Plan.query()
                .whereRaw('plans.id = accounts."forcedPlanId"')
                .whereNot("plans.name", "free"),
            );
        }),
    );
  return users.map((user) => user.id);
}

const recipients = await getPayingTeamOwnerIds();
console.log(`${recipients.length} paying team owners resolved`);

// Emailing every customer is not something a stray run should do.
if (process.argv.includes("--send")) {
  await sendNotification({
    type: "terms_updated",
    data: { effectiveDate: EFFECTIVE_DATE },
    recipients,
  });
  console.log(`Notification queued for ${recipients.length} recipients`);
} else {
  console.log("Dry run. Re-run with --send to queue the notification.");
}

// Close what the script opened so the process ends on its own. A one-off task
// has to terminate, and exiting explicitly instead would risk truncating the
// output above, since stdout is asynchronous when it is a pipe.
await knex.destroy();
await quitAmqp();
