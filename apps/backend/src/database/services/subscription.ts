import { assertNever } from "@argos/util/assertNever";
import { captureException } from "@sentry/node";

import { notifyDiscord } from "@/discord";

import { Account, type Subscription } from "../models";

/**
 * Notify a subscription status update.
 */
export async function notifySubscriptionStatusUpdate(args: {
  provider: Subscription["provider"];
  status: Subscription["status"] | "cancel_scheduled";
  account: Account;
  previousStatus?: Subscription["status"];
}) {
  const { provider, status, account, previousStatus } = args;

  const providerName = (() => {
    switch (provider) {
      case "stripe":
        return "Stripe";
      case "github":
        return "GitHub";
      default:
        assertNever(provider);
    }
  })();

  const message = (() => {
    switch (status) {
      case "active":
        if (previousStatus === "trialing") {
          return `🎉 Subscription activated from trial`;
        }
        return `🎉 Subscription activated`;
      case "trialing":
        return `🚀 Trial started`;
      case "canceled":
        if (previousStatus === "trialing") {
          return `❌ Trial canceled`;
        }
        return `❌ Subscription canceled`;
      case "cancel_scheduled":
        return `⏳ Subscription has been marked to cancel`;
      default:
        return `⚠️ Subscription status changed to *${status}*`;
    }
  })();

  const teamLink = `[View Team](<https://app.argos-ci.com/${account.slug}>)`;

  const externalLink =
    provider === "stripe"
      ? `[View in Stripe](<https://dashboard.stripe.com/customers/${account.stripeCustomerId}>)`
      : null;

  try {
    await notifyDiscord({
      content: [
        `${providerName} • ${message}`,
        `👤 *${account.displayName}* (ID: ${account.id})`,
        `🔗 ${teamLink}${externalLink ? ` • ${externalLink}` : ""}`,
      ].join("\n"),
    });
  } catch (error) {
    captureException(error);
  }
}
