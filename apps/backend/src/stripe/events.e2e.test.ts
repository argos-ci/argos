import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { factory, setupDatabase } from "@/database/testing";
import * as discord from "@/discord";

import {
  CANCEL_SUBSCRIPTION_EVENT_PAYLOAD,
  CANCELLATION_FEEDBACK_UPDATED_SUBSCRIPTION_EVENT_PAYLOAD,
  STRIPE_PRODUCT_ID,
} from "./fixtures/cancel-subscription-event-payload";
import { handleStripeEvent, stripe } from "./index";

describe("handleStripeEvent", () => {
  beforeEach(async () => {
    await setupDatabase();
    vi.restoreAllMocks();

    const [user, account, plan] = await Promise.all([
      factory.User.create(),
      factory.TeamAccount.create(),
      factory.Plan.create({ stripeProductId: STRIPE_PRODUCT_ID }),
    ]);
    await factory.Subscription.create({
      accountId: account.id,
      subscriberId: user.id,
      planId: plan.id,
      provider: "stripe",
      stripeSubscriptionId: CANCEL_SUBSCRIPTION_EVENT_PAYLOAD.data.object.id,
      status: "active",
    });
  });

  describe("customer.subscription.updated", () => {
    it("sends a discord notification when cancellation feedback is updated", async () => {
      const send = vi
        .spyOn(discord, "notifyDiscord")
        .mockResolvedValue(undefined);
      vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue(
        CANCELLATION_FEEDBACK_UPDATED_SUBSCRIPTION_EVENT_PAYLOAD.data
          .object as Stripe.Response<Stripe.Subscription>,
      );

      await handleStripeEvent({
        type: "customer.subscription.updated",
        data: CANCELLATION_FEEDBACK_UPDATED_SUBSCRIPTION_EVENT_PAYLOAD.data,
      });

      expect(send).toHaveBeenCalledOnce();
      if (send.mock.calls[0] === undefined) {
        throw new Error("Expected notifyDiscord to be called with arguments");
      }
      const content = send.mock.calls[0][0].content;
      expect(content).toContain("Subscription has been marked to cancel");
      expect(content).toContain("Reason: too_expensive");
    });
  });

  describe("customer.subscription.deleted", () => {
    it("sends a discord notification with cancellation comment reason", async () => {
      const send = vi
        .spyOn(discord, "notifyDiscord")
        .mockResolvedValue(undefined);

      await handleStripeEvent({
        type: "customer.subscription.deleted",
        data: CANCEL_SUBSCRIPTION_EVENT_PAYLOAD.data,
      });

      expect(send).toHaveBeenCalledOnce();
      if (send.mock.calls[0] === undefined) {
        throw new Error("Expected notifyDiscord to be called with arguments");
      }
      const content = send.mock.calls[0][0].content;
      expect(content).toContain("Subscription canceled");
      expect(content).toContain("Reason: The price jump was too sporadic.");
    });
  });
});
