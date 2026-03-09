import { assertNever } from "@argos/util/assertNever";
import { captureException } from "@sentry/node";

import { notifyDiscord } from "@/discord";

import { Account, type Subscription } from "../models";

type SubscriptionStatus = Subscription["status"] | "cancel_scheduled";

function getProviderName(provider: Subscription["provider"]) {
  switch (provider) {
    case "stripe":
      return "Stripe";

    case "github":
      return "GitHub";

    default:
      assertNever(provider);
  }
}

function getStatusMessage(args: {
  status: SubscriptionStatus;
  previousStatus: SubscriptionStatus | undefined;
}) {
  const { status, previousStatus } = args;

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
}

/**
 * Notify a subscription status update.
 */
export async function notifySubscriptionStatusUpdate(args: {
  provider: Subscription["provider"];
  status: SubscriptionStatus;
  account: Account;
  previousStatus?: SubscriptionStatus;
  cancelReason?: string | undefined | null;
}) {
  const {
    provider,
    status,
    account,
    previousStatus,
    cancelReason: reason,
  } = args;

  const providerName = getProviderName(provider);
  const statusMessage = getStatusMessage({ status, previousStatus });

  const teamLink = `[View Team](<https://app.argos-ci.com/${account.slug}>)`;

  const links = [teamLink];

  if (provider === "stripe" && account.stripeCustomerId) {
    links.push(
      `[View in Stripe](<https://dashboard.stripe.com/customers/${account.stripeCustomerId}>)`,
    );
  }

  try {
    await notifyDiscord({
      content: [
        `${providerName} • ${statusMessage}`,
        reason ? `📝 Reason: ${reason}` : "",
        `👤 *${account.displayName}* (ID: ${account.id})`,
        `🔗 ${links.join(" • ")}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  } catch (error) {
    captureException(error);
  }
}
