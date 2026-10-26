import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type { Subscription } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const CancellationsQuery = `
  query Cancellations($days: Int!) {
    staffCancellations(days: $days) {
      id
      team {
        id
      }
      canceledAt
      endDate
      cancellationReason
      cancellationFeedback
      cancellationComment
      staffContactedAt
      monthlyRevenue
      lifetimeRevenue
    }
  }
`;

const SetContactMutation = `
  mutation SetStaffCancellationContact(
    $subscriptionId: ID!
    $contacted: Boolean!
  ) {
    setStaffCancellationContact(
      input: { subscriptionId: $subscriptionId, contacted: $contacted }
    ) {
      id
      staffContactedAt
    }
  }
`;

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
}

async function createViewer(options: { staff: boolean }) {
  const userAccount = await factory.UserAccount.create();
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");
  await userAccount.user.$query().patch({ staff: options.staff });
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");

  return { userAccount, user: userAccount.user };
}

type Viewer = Awaited<ReturnType<typeof createViewer>>;

async function createApp(viewer: Viewer) {
  return createApolloServerApp(apolloServer, createApolloMiddleware, {
    user: viewer.user,
    account: viewer.userAccount,
  });
}

/** A team on a paid plan whose subscription ended three weeks after it asked. */
async function createCanceledTeam(overrides: Partial<Subscription> = {}) {
  const [teamAccount, plan] = await Promise.all([
    factory.TeamAccount.create(),
    factory.Plan.create(),
  ]);
  const subscription = await factory.Subscription.create({
    accountId: teamAccount.id,
    planId: plan.id,
    status: "canceled",
    canceledAt: daysFromNow(-25),
    endDate: daysFromNow(-4),
    ...overrides,
  });
  return { teamAccount, plan, subscription };
}

async function queryCancellations(viewer: Viewer, days = 90) {
  const app = await createApp(viewer);
  const res = await request(app)
    .post("/graphql")
    .send({ query: CancellationsQuery, variables: { days } });
  expectNoGraphQLError(res);
  return res.body.data.staffCancellations as {
    id: string;
    team: { id: string };
    cancellationReason: string | null;
    cancellationFeedback: string | null;
    cancellationComment: string | null;
    staffContactedAt: string | null;
    monthlyRevenue: number | null;
    lifetimeRevenue: number | null;
  }[];
}

describe("GraphQL staffCancellations", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("lists a cancellation still running with why it was asked for", async () => {
    const viewer = await createViewer({ staff: true });
    const { subscription } = await createCanceledTeam({
      status: "active",
      canceledAt: daysFromNow(-2),
      endDate: daysFromNow(12),
      cancellationReason: "cancellation_requested",
      cancellationFeedback: "too_expensive",
      cancellationComment: "Over budget this year",
    });

    const [entry, ...rest] = await queryCancellations(viewer);

    expect(rest).toHaveLength(0);
    expect(entry).toMatchObject({
      id: subscription.id,
      cancellationReason: "cancellation_requested",
      cancellationFeedback: "too_expensive",
      cancellationComment: "Over budget this year",
      staffContactedAt: null,
    });
  });

  it("prices a Stripe subscription off what it was paid", async () => {
    const viewer = await createViewer({ staff: true });
    const { subscription } = await createCanceledTeam({
      provider: "stripe",
      stripeSubscriptionId: "sub_churned",
      subscriberId: viewer.user.id,
      cancellationReason: "payment_failed",
    });
    await Promise.all([
      factory.StripeInvoice.create({
        stripeSubscriptionId: "sub_churned",
        stripeCreatedAt: daysFromNow(-60),
        currency: "eur",
        total: 10_000,
        totalExcludingTax: 10_000,
      }),
      factory.StripeInvoice.create({
        stripeSubscriptionId: "sub_churned",
        stripeCreatedAt: daysFromNow(-30),
        currency: "eur",
        total: 14_400,
        totalExcludingTax: 12_000,
      }),
      // The bill whose payment failed: it was never paid, so it is worth
      // nothing to the figures.
      factory.StripeInvoice.create({
        stripeSubscriptionId: "sub_churned",
        stripeCreatedAt: daysFromNow(-5),
        status: "uncollectible",
        currency: "eur",
        total: 50_000,
        totalExcludingTax: 50_000,
      }),
    ]);

    const [entry] = await queryCancellations(viewer);

    invariant(entry, "cancellation missing");
    expect(entry.id).toBe(subscription.id);
    // The last paid cycle, tax excluded.
    expect(entry.monthlyRevenue).toBe(120);
    expect(entry.lifetimeRevenue).toBe(220);
  });

  it("leaves out a trial that ran out without a card", async () => {
    const viewer = await createViewer({ staff: true });
    const trialEnd = daysFromNow(-4);
    await createCanceledTeam({
      paymentMethodFilled: false,
      trialEndDate: trialEnd,
      endDate: trialEnd,
      canceledAt: null,
    });
    // Same dates, but the team answered the survey: it asked to stop.
    const { subscription: asked } = await createCanceledTeam({
      paymentMethodFilled: false,
      trialEndDate: trialEnd,
      endDate: trialEnd,
      cancellationFeedback: "missing_features",
    });

    const entries = await queryCancellations(viewer);

    expect(entries.map((entry) => entry.id)).toEqual([asked.id]);
  });

  it("leaves out a team that is a customer again, and old cancellations", async () => {
    const viewer = await createViewer({ staff: true });
    const { teamAccount, plan } = await createCanceledTeam();
    await factory.Subscription.create({
      accountId: teamAccount.id,
      planId: plan.id,
      status: "active",
      startDate: daysFromNow(-2),
      endDate: null,
    });
    await createCanceledTeam({
      canceledAt: daysFromNow(-200),
      endDate: daysFromNow(-180),
    });

    expect(await queryCancellations(viewer, 90)).toHaveLength(0);
    expect(await queryCancellations(viewer, 365)).toHaveLength(1);
  });

  it("lists only the latest cancellation of a team", async () => {
    const viewer = await createViewer({ staff: true });
    const { teamAccount, plan } = await createCanceledTeam({
      canceledAt: daysFromNow(-60),
      endDate: daysFromNow(-50),
    });
    const latest = await factory.Subscription.create({
      accountId: teamAccount.id,
      planId: plan.id,
      status: "canceled",
      canceledAt: daysFromNow(-10),
      endDate: daysFromNow(-3),
    });

    const entries = await queryCancellations(viewer);

    expect(entries.map((entry) => entry.id)).toEqual([latest.id]);
  });

  it("records that the team was written to, then clears it", async () => {
    const viewer = await createViewer({ staff: true });
    const { subscription } = await createCanceledTeam();
    const app = await createApp(viewer);

    const marked = await request(app)
      .post("/graphql")
      .send({
        query: SetContactMutation,
        variables: { subscriptionId: subscription.id, contacted: true },
      });
    expectNoGraphQLError(marked);
    expect(
      marked.body.data.setStaffCancellationContact.staffContactedAt,
    ).not.toBeNull();

    const cleared = await request(app)
      .post("/graphql")
      .send({
        query: SetContactMutation,
        variables: { subscriptionId: subscription.id, contacted: false },
      });
    expectNoGraphQLError(cleared);
    expect(
      cleared.body.data.setStaffCancellationContact.staffContactedAt,
    ).toBeNull();
  });

  it("is refused to non-staff users", async () => {
    const viewer = await createViewer({ staff: false });
    await createCanceledTeam();
    const app = await createApp(viewer);

    const res = await request(app)
      .post("/graphql")
      .send({ query: CancellationsQuery, variables: { days: 90 } });

    expect(res.body.errors[0].extensions.code).toBe("FORBIDDEN");
  });
});
