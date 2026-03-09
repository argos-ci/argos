import { beforeEach, describe, expect, it, vi } from "vitest";

import { factory, setupDatabase } from "@/database/testing";
import * as discord from "@/discord";

import { CANCEL_SUBSCRIPTION_EVENT_PAYLOAD } from "./fixtures/cancel-subscription-event-payload";
import { handleStripeEvent } from "./index";

describe("handleStripeEvent", () => {
  beforeEach(async () => {
    await setupDatabase();
    vi.clearAllMocks();

    const [user, account] = await Promise.all([
      factory.User.create(),
      factory.TeamAccount.create(),
    ]);
    await factory.Subscription.create({
      accountId: account.id,
      subscriberId: user.id,
      provider: "stripe",
      stripeSubscriptionId: CANCEL_SUBSCRIPTION_EVENT_PAYLOAD.data.object.id,
      status: "active",
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
