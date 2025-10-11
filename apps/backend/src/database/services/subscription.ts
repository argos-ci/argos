import { captureException } from "@sentry/node";

import { notifyDiscord } from "@/discord";

import { Account, type Subscription } from "../models";

/**
 * Notify a subscription status update.
 */
export async function notifySubscriptionStatusUpdate(args: {
  provider: Subscription["provider"];
  status: Subscription["status"];
  account: Account;
}) {
  const { provider, status, account } = args;

  const message =
    status === "active"
      ? `🎉 New customer active`
      : status === "trialing"
        ? `🚀 New Trial`
        : `⚠️ Subscription status update "${status}" `;

  try {
    await notifyDiscord({
      content: `${provider} - ${message} for ${account.displayName} (ID: ${account.id})`,
    });
  } catch (error) {
    captureException(error);
  }
}
