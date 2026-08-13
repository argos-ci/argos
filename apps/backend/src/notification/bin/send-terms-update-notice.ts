#!/usr/bin/env node
import { setTimeout as delay } from "node:timers/promises";
import { invariant } from "@argos/util/invariant";

import config from "@/config";
import { knex } from "@/database";
import { Plan, Subscription, TeamUser, User } from "@/database/models";
import { sendEmail } from "@/email/send";

import { handler } from "../handlers/terms_updated";
import { extractFirstName } from "../message-job";

/**
 * Date the new terms take effect for existing paid subscriptions. It must match
 * the date published in the terms themselves, which promise thirty days'
 * notice counted from their publication.
 */
const EFFECTIVE_DATE = "2026-09-11";

/**
 * Resend rate limits us per second, so the run is sequential with a margin.
 * This is a one-off sent by hand: tripping the limit would fail recipients for
 * no reason, and there is nothing to gain from finishing a minute sooner.
 */
const DELAY_BETWEEN_SENDS_MS = 600;

type Recipient = { id: string; email: string; name: string | null };

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
 * auto-join and invite matching, and is not a delivery list.
 */
async function getPayingTeamOwners(): Promise<Recipient[]> {
  const users = await User.query()
    .withGraphFetched("account")
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

  return users.map((user) => {
    const { email, account } = user;
    invariant(email, "users without an email are filtered out by the query");
    invariant(account, "every user has an account");
    return {
      id: user.id,
      email,
      // Same greeting the notification pipeline would produce.
      name: account.name ? extractFirstName(account.name) : null,
    };
  });
}

/** Reads `--only <email>`, used to send a single real email as a smoke test. */
function getOnlyOption(): string | null {
  const index = process.argv.indexOf("--only");
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

let recipients = await getPayingTeamOwners();
console.log(`${recipients.length} paying team owners resolved`);

const only = getOnlyOption();
if (only) {
  recipients = recipients.filter((recipient) => recipient.email === only);
  invariant(
    recipients.length > 0,
    `--only ${only} matches none of the recipients above`,
  );
  console.log(`Restricted to ${only}`);
}

if (process.argv.includes("--send")) {
  // Without a key `sendEmail` returns null and reports nothing, so the run
  // would claim to have delivered every notice while sending none.
  invariant(
    config.get("resend.apiKey"),
    "RESEND_API_KEY is required to send, otherwise emails are silently dropped",
  );

  // The layout builds the logo URL from `server.url`. Left on a development
  // host it still renders and still sends, but every recipient gets a broken
  // image and a privacy warning from their mail client.
  const serverUrl = config.get("server.url");
  invariant(
    !/argos-ci\.dev|localhost|127\.0\.0\.1/.test(serverUrl),
    `SERVER_URL is ${serverUrl}, so the logo would point at a host recipients cannot reach. Set SERVER_URL=https://app.argos-ci.com`,
  );

  const failures: string[] = [];
  for (const [index, recipient] of recipients.entries()) {
    const position = `[${index + 1}/${recipients.length}]`;
    try {
      const email = handler.email({
        effectiveDate: EFFECTIVE_DATE,
        ctx: {
          user: { id: recipient.id, name: recipient.name },
          // The `account` category is not configurable, so there is nothing to
          // link to and no unsubscribe footer.
          preferencesUrl: null,
        },
      });
      await sendEmail({
        to: [recipient.email],
        subject: email.subject,
        react: email.body,
      });
      // Printed as it happens: an interrupted run has to leave a precise
      // record of who was already served.
      console.log(`${position} sent ${recipient.email}`);
    } catch (error) {
      failures.push(recipient.email);
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`${position} FAILED ${recipient.email}: ${reason}`);
    }
    await delay(DELAY_BETWEEN_SENDS_MS);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} failed, re-run with --only for each:`);
    for (const email of failures) {
      console.error(`  ${email}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`\nDone, ${recipients.length} sent.`);
  }
} else {
  for (const recipient of recipients) {
    console.log(`  ${recipient.email}`);
  }
  console.log("\nDry run. Re-run with --send to actually send the emails.");
}

await knex.destroy();
