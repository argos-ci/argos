import { assertNever } from "@argos/util/assertNever";
import { captureException } from "@sentry/node";

import { formatDiscordLink, getAccountUrl, notifyDiscord } from "@/discord";

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

  try {
    await notifyDiscord({
      content: [
        `${providerName} • ${statusMessage}`,
        reason ? `📝 Reason: ${reason}` : "",
        ...formatAccountLines(account, provider),
      ]
        .filter(Boolean)
        .join("\n"),
    });
  } catch (error) {
    captureException(error);
  }
}

/**
 * Notify that a trialing team has added its payment method, so it will convert
 * to a paid subscription instead of being canceled when the trial ends.
 */
export async function notifyPaymentMethodAdded(args: {
  provider: Subscription["provider"];
  account: Account;
}) {
  const { provider, account } = args;
  const providerName = getProviderName(provider);

  try {
    await notifyDiscord({
      content: [
        `${providerName} • 💳 Payment method added during trial`,
        ...formatAccountLines(account, provider),
      ].join("\n"),
    });
  } catch (error) {
    captureException(error);
  }
}

/**
 * Build the shared account identity used by every subscription notification:
 * the team name linked to the team in the app (the name falls back to the slug
 * so it is never "null"), and, for Stripe, a link to the customer in the Stripe
 * dashboard.
 */
function formatAccountLines(
  account: Account,
  provider: Subscription["provider"],
): string[] {
  const lines = [
    `👤 ${formatDiscordLink(account.displayName, getAccountUrl(account.slug))} (ID: ${account.id})`,
  ];

  if (provider === "stripe" && account.stripeCustomerId) {
    lines.push(
      `🔗 ${formatDiscordLink(
        "View in Stripe",
        `https://dashboard.stripe.com/customers/${account.stripeCustomerId}`,
      )}`,
    );
  }

  return lines;
}
