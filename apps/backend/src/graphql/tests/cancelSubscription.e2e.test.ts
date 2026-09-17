import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Subscription } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { stripe, type Stripe } from "@/stripe";
import {
  CANCEL_RESUMED_SUBSCRIPTION,
  CANCEL_SCHEDULED_SUBSCRIPTION,
  STRIPE_PRODUCT_ID,
} from "@/stripe/fixtures/cancel-subscription-event-payload";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { createApolloServerApp } from "./util";

const CANCEL_MUTATION = `
  mutation CancelSubscription($input: CancelSubscriptionInput!) {
    cancelSubscription(input: $input) {
      id
      subscription {
        id
        endDate
      }
    }
  }
`;

const RESUME_MUTATION = `
  mutation ResumeSubscription($input: ResumeSubscriptionInput!) {
    resumeSubscription(input: $input) {
      id
      subscription {
        id
        endDate
      }
    }
  }
`;

const IN_TWENTY_DAYS = new Date(
  Date.now() + 20 * 24 * 60 * 60 * 1000,
).toISOString();

async function createUserAccount() {
  const userAccount = await factory.UserAccount.create();
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");
  invariant(userAccount.userId, "user account has no user");
  return { account: userAccount, user: userAccount.user };
}

/**
 * A team on a Stripe subscription, with `user` sitting on it at the given
 * level. The plan is keyed on the fixture's product id because both mutations
 * sync the answer Stripe gives back into our own row.
 */
async function createSubscribedTeam(options: {
  userId: string;
  userLevel: "owner" | "member";
  /** Set to schedule the cancellation these tests then call off. */
  endDate?: string;
}) {
  const [teamAccount, plan, subscriber] = await Promise.all([
    factory.TeamAccount.create(),
    factory.Plan.create({ stripeProductId: STRIPE_PRODUCT_ID }),
    factory.User.create(),
  ]);
  invariant(teamAccount.teamId, "team account has no team");
  await Promise.all([
    factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: options.userId,
      userLevel: options.userLevel,
    }),
    factory.Subscription.create({
      accountId: teamAccount.id,
      subscriberId: subscriber.id,
      planId: plan.id,
      provider: "stripe",
      stripeSubscriptionId: CANCEL_SCHEDULED_SUBSCRIPTION.id,
      status: "active",
      endDate: options.endDate ?? null,
    }),
  ]);
  return teamAccount;
}

/**
 * A spy that makes the call impossible rather than merely unexpected.
 *
 * Left calling through, a guard that stops working would send a real
 * `subscriptions.update` to whatever key the test env resolves, mutating a live
 * subscription instead of failing here.
 */
function spyOnStripeUpdate() {
  return vi
    .spyOn(stripe.subscriptions, "update")
    .mockRejectedValue(
      new Error("stripe.subscriptions.update must not be called"),
    );
}

describe("GraphQL cancelSubscription", () => {
  beforeEach(async () => {
    await setupDatabase();
    vi.restoreAllMocks();
  });

  it("sends the reason to Stripe and schedules the end of the subscription", async () => {
    const { account, user } = await createUserAccount();
    invariant(user.id, "user has no id");
    const teamAccount = await createSubscribedTeam({
      userId: user.id,
      userLevel: "owner",
    });
    const update = vi
      .spyOn(stripe.subscriptions, "update")
      .mockResolvedValue(
        CANCEL_SCHEDULED_SUBSCRIPTION as Stripe.Response<Stripe.Subscription>,
      );

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: CANCEL_MUTATION,
        variables: {
          input: {
            accountId: teamAccount.id,
            reason: "too_expensive",
            comment: "  We only run a few builds a month.  ",
          },
        },
      });

    expect(res.body.errors).toBeUndefined();
    expect(update).toHaveBeenCalledWith(CANCEL_SCHEDULED_SUBSCRIPTION.id, {
      cancel_at_period_end: true,
      cancellation_details: {
        feedback: "too_expensive",
        comment: "We only run a few builds a month.",
      },
    });

    // The row is written from Stripe's answer rather than left for the webhook,
    // so the screen that made the call shows the end date right away.
    const subscription = await Subscription.query()
      .findOne({ stripeSubscriptionId: CANCEL_SCHEDULED_SUBSCRIPTION.id })
      .throwIfNotFound();
    expect(subscription.endDate).not.toBeNull();
    expect(
      res.body.data.cancelSubscription.subscription.endDate,
    ).not.toBeNull();
  });

  it("refuses a member who is not an admin of the team", async () => {
    const { account, user } = await createUserAccount();
    invariant(user.id, "user has no id");
    const teamAccount = await createSubscribedTeam({
      userId: user.id,
      userLevel: "member",
    });
    const update = spyOnStripeUpdate();

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: CANCEL_MUTATION,
        variables: {
          input: { accountId: teamAccount.id, reason: "unused" },
        },
      });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions.code).toBe("FORBIDDEN");
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses an `other` reason with nothing written in the comment", async () => {
    const { account, user } = await createUserAccount();
    invariant(user.id, "user has no id");
    const teamAccount = await createSubscribedTeam({
      userId: user.id,
      userLevel: "owner",
    });
    const update = spyOnStripeUpdate();

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: CANCEL_MUTATION,
        variables: {
          input: {
            accountId: teamAccount.id,
            reason: "other",
            comment: "   ",
          },
        },
      });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions.code).toBe("BAD_USER_INPUT");
    expect(update).not.toHaveBeenCalled();
  });
});

describe("GraphQL resumeSubscription", () => {
  beforeEach(async () => {
    await setupDatabase();
    vi.restoreAllMocks();
  });

  it("calls off the scheduled end without touching the recorded reason", async () => {
    const { account, user } = await createUserAccount();
    invariant(user.id, "user has no id");
    const teamAccount = await createSubscribedTeam({
      userId: user.id,
      userLevel: "owner",
      endDate: IN_TWENTY_DAYS,
    });
    const update = vi
      .spyOn(stripe.subscriptions, "update")
      .mockResolvedValue(
        CANCEL_RESUMED_SUBSCRIPTION as Stripe.Response<Stripe.Subscription>,
      );

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: RESUME_MUTATION,
        variables: { input: { accountId: teamAccount.id } },
      });

    expect(res.body.errors).toBeUndefined();
    // Exactly this payload: a `cancellation_details` here would wipe the answers
    // the customer gave on their way out.
    expect(update).toHaveBeenCalledWith(CANCEL_SCHEDULED_SUBSCRIPTION.id, {
      cancel_at_period_end: false,
    });

    const subscription = await Subscription.query()
      .findOne({ stripeSubscriptionId: CANCEL_SCHEDULED_SUBSCRIPTION.id })
      .throwIfNotFound();
    expect(subscription.endDate).toBeNull();
    expect(res.body.data.resumeSubscription.subscription.endDate).toBeNull();
  });

  it("refuses a member who is not an admin of the team", async () => {
    const { account, user } = await createUserAccount();
    invariant(user.id, "user has no id");
    const teamAccount = await createSubscribedTeam({
      userId: user.id,
      userLevel: "member",
      endDate: IN_TWENTY_DAYS,
    });
    const update = spyOnStripeUpdate();

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: RESUME_MUTATION,
        variables: { input: { accountId: teamAccount.id } },
      });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions.code).toBe("FORBIDDEN");
    expect(update).not.toHaveBeenCalled();
  });

  it("refuses a subscription Stripe does not manage", async () => {
    const { account, user } = await createUserAccount();
    invariant(user.id, "user has no id");
    const [teamAccount, plan] = await Promise.all([
      factory.TeamAccount.create(),
      factory.Plan.create(),
    ]);
    invariant(teamAccount.teamId, "team account has no team");
    await Promise.all([
      factory.TeamUser.create({
        teamId: teamAccount.teamId,
        userId: user.id,
        userLevel: "owner",
      }),
      factory.Subscription.create({
        accountId: teamAccount.id,
        planId: plan.id,
        provider: "github",
        status: "active",
      }),
    ]);
    const update = spyOnStripeUpdate();

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: RESUME_MUTATION,
        variables: { input: { accountId: teamAccount.id } },
      });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions.code).toBe("BAD_USER_INPUT");
    expect(update).not.toHaveBeenCalled();
  });
});
