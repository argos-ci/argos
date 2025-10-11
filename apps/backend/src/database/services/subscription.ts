import { captureException } from "@sentry/node";

import { notifyDiscord } from "@/discord";

import { Account, type Subscription } from "../models";

/**
 * Notify a subscription status update.
 */
export async function notifySubscriptionStatusUpdate(args: {
  subscription: Pick<Subscription, "provider" | "status" | "accountId">;
  account?: Account;
}) {
  try {
    const {
      subscription,
      account = await Account.query()
        .findById(subscription.accountId)
        .throwIfNotFound(),
    } = args;

    const message =
      subscription.status === "active"
        ? `🎉 New customer active`
        : subscription.status === "trialing"
          ? `🚀 New Trial`
          : `⚠️ Subscription status update "${subscription.status}" `;

    await notifyDiscord({
      content: `${subscription.provider} - ${message} for ${account.displayName} (ID: ${account.id})`,
    });
  } catch (error) {
    captureException(error);
  }
}
