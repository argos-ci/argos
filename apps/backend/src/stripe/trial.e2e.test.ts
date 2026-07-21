import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Subscription } from "@/database/models";
import type { Account, Plan } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import * as notification from "@/notification";
import { redisLock } from "@/util/redis";

import {
  ENDED_TRIAL_STRIPE_SUBSCRIPTION,
  TRIAL_CONVERSION_TIMESTAMP,
  TRIAL_INCLUDED_SCREENSHOTS,
  TRIAL_STRIPE_PRODUCT_ID,
  TRIAL_STRIPE_SUBSCRIPTION_ID,
  TRIALING_STRIPE_SUBSCRIPTION,
} from "./fixtures/trial-subscription";
import { endTrialToUnlockUsage, stripe } from "./index";

describe("endTrialToUnlockUsage", () => {
  let account: Account;
  let plan: Plan;
  let owner: { id: string };

  beforeEach(async () => {
    await setupDatabase();
    vi.restoreAllMocks();

    const [team, user] = await Promise.all([
      factory.Team.create(),
      factory.User.create(),
    ]);
    [account, plan] = await Promise.all([
      factory.TeamAccount.create({ teamId: team.id }),
      factory.Plan.create({
        usageBased: true,
        includedScreenshots: TRIAL_INCLUDED_SCREENSHOTS,
        stripeProductId: TRIAL_STRIPE_PRODUCT_ID,
      }),
    ]);
    owner = user;
    await factory.TeamUser.create({
      teamId: team.id,
      userId: user.id,
      userLevel: "owner",
    });
  });

  async function createSubscription(props: Partial<Subscription>) {
    return factory.Subscription.create({
      accountId: account.id,
      planId: plan.id,
      subscriberId: owner.id,
      provider: "stripe",
      stripeSubscriptionId: TRIAL_STRIPE_SUBSCRIPTION_ID,
      status: "trialing",
      paymentMethodFilled: true,
      ...props,
    });
  }

  function mockStripeUpdate() {
    return vi
      .spyOn(stripe.subscriptions, "update")
      .mockResolvedValue(
        ENDED_TRIAL_STRIPE_SUBSCRIPTION as Stripe.Response<Stripe.Subscription>,
      );
  }

  function mockStripeRetrieve(
    stripeSubscription = TRIALING_STRIPE_SUBSCRIPTION,
  ) {
    return vi
      .spyOn(stripe.subscriptions, "retrieve")
      .mockResolvedValue(
        stripeSubscription as Stripe.Response<Stripe.Subscription>,
      );
  }

  it("ends the trial and unlocks the usage", async () => {
    const update = mockStripeUpdate();
    mockStripeRetrieve();
    const send = vi
      .spyOn(notification, "sendNotification")
      .mockResolvedValue(undefined);
    const subscription = await createSubscription({});

    await expect(endTrialToUnlockUsage(account)).resolves.toBe(true);

    expect(update).toHaveBeenCalledWith(TRIAL_STRIPE_SUBSCRIPTION_ID, {
      trial_end: "now",
    });
    const updated = await Subscription.query()
      .findById(subscription.id)
      .throwIfNotFound();
    expect(updated.status).toBe("active");
    // A fresh billing period starts at the conversion, so the screenshots
    // consumed during the trial are not counted against it.
    expect(new Date(updated.startDate).getTime()).toBe(
      TRIAL_CONVERSION_TIMESTAMP * 1000,
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "trial_ended",
        recipients: [owner.id],
      }),
    );
  });

  it("blocks the usage when no payment method is filled", async () => {
    const update = mockStripeUpdate();
    await createSubscription({ paymentMethodFilled: false });

    await expect(endTrialToUnlockUsage(account)).resolves.toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("blocks the usage for a non-Stripe subscription", async () => {
    const update = mockStripeUpdate();
    await createSubscription({
      provider: "github",
      stripeSubscriptionId: null,
    });

    await expect(endTrialToUnlockUsage(account)).resolves.toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("unlocks without calling Stripe when the trial is already converted", async () => {
    const update = mockStripeUpdate();
    const send = vi
      .spyOn(notification, "sendNotification")
      .mockResolvedValue(undefined);
    await createSubscription({ status: "active" });

    await expect(endTrialToUnlockUsage(account)).resolves.toBe(true);
    expect(update).not.toHaveBeenCalled();
    // The build that actually converted the trial owns the notification.
    expect(send).not.toHaveBeenCalled();
  });

  it("unlocks a past due subscription without calling Stripe", async () => {
    const update = mockStripeUpdate();
    await createSubscription({ status: "past_due" });

    // past_due usage based subscriptions were never capacity blocked.
    await expect(endTrialToUnlockUsage(account)).resolves.toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it("keeps the usage blocked when the trial was canceled after the capacity check", async () => {
    const update = mockStripeUpdate();
    const subscription = await createSubscription({});

    // Memoize the trialing subscription the way `checkIsOutOfCapacity` does,
    // then cancel it behind the manager's back.
    await account.$getSubscriptionManager().getActiveSubscription();
    await subscription.$query().patch({ status: "canceled" });

    await expect(endTrialToUnlockUsage(account)).resolves.toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("does not fail when the notification cannot be sent", async () => {
    mockStripeUpdate();
    mockStripeRetrieve();
    vi.spyOn(notification, "sendNotification").mockRejectedValue(
      new Error("broker unavailable"),
    );
    const subscription = await createSubscription({});

    await expect(endTrialToUnlockUsage(account)).resolves.toBe(true);
    const updated = await Subscription.query()
      .findById(subscription.id)
      .throwIfNotFound();
    expect(updated.status).toBe("active");
  });

  it("syncs and notifies when the trial is already ended at Stripe", async () => {
    // A previous attempt ended the trial but failed before syncing it back
    // (lock timeout, crash): Stripe reports the subscription as active while
    // the Argos row still says trialing.
    const update = mockStripeUpdate();
    mockStripeRetrieve(ENDED_TRIAL_STRIPE_SUBSCRIPTION);
    const send = vi
      .spyOn(notification, "sendNotification")
      .mockResolvedValue(undefined);
    const subscription = await createSubscription({});

    await expect(endTrialToUnlockUsage(account)).resolves.toBe(true);

    // The trial must not be ended twice.
    expect(update).not.toHaveBeenCalled();
    const updated = await Subscription.query()
      .findById(subscription.id)
      .throwIfNotFound();
    expect(updated.status).toBe("active");
    expect(new Date(updated.startDate).getTime()).toBe(
      TRIAL_CONVERSION_TIMESTAMP * 1000,
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ type: "trial_ended" }),
    );
  });

  it("surfaces deterministic errors instead of failing open", async () => {
    mockStripeUpdate();
    mockStripeRetrieve();
    // The subscription's Stripe product has no matching Argos plan: failing
    // open here would grant unlimited unbilled usage on every build.
    await plan.$query().patch({ stripeProductId: "prod_unmapped" });
    await createSubscription({});

    await expect(endTrialToUnlockUsage(account)).rejects.toThrow(
      "prod_trial_test",
    );
  });

  it("lets the build through when Stripe is unavailable", async () => {
    const update = mockStripeUpdate();
    vi.spyOn(stripe.subscriptions, "retrieve").mockRejectedValue(
      new Error("stripe is down"),
    );
    const subscription = await createSubscription({});

    await expect(endTrialToUnlockUsage(account)).resolves.toBe(true);

    expect(update).not.toHaveBeenCalled();
    // The conversion is retried on the next build.
    const updated = await Subscription.query()
      .findById(subscription.id)
      .throwIfNotFound();
    expect(updated.status).toBe("trialing");
  });

  it("does not acquire the lock when the trial can't be converted", async () => {
    const acquire = vi.spyOn(redisLock, "acquire");
    await createSubscription({ paymentMethodFilled: false });

    await expect(endTrialToUnlockUsage(account)).resolves.toBe(false);
    expect(acquire).not.toHaveBeenCalled();
  });
});
