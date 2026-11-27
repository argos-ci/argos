import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { TeamOutreach, type Subscription } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const EnterpriseQuery = `
  query Enterprise {
    staffEnterprise {
      candidates {
        id
        team {
          id
        }
        currency
        currentPeriodAmount
        previousPeriodAmount
        staffContactedAt
      }
      trials {
        id
        team {
          id
        }
        includedScreenshots
        periodStart
        periodEnd
        periodScreenshots
      }
      contracts {
        id
        team {
          id
        }
        plan {
          interval
        }
        currency
        amount
        includedScreenshots
        periodStart
        periodEnd
        periodScreenshots
        previousPeriodAmount
        renewalEmailedAt
      }
    }
  }
`;

const SetContactMutation = `
  mutation SetStaffEnterpriseOfferContact(
    $subscriptionId: ID!
    $contacted: Boolean!
  ) {
    setStaffEnterpriseOfferContact(
      input: { subscriptionId: $subscriptionId, contacted: $contacted }
    ) {
      id
      staffContactedAt
    }
  }
`;

const LogRenewalEmailMutation = `
  mutation LogRenewalEmail($subscriptionId: ID!) {
    logStaffEnterpriseRenewalEmail(input: { subscriptionId: $subscriptionId }) {
      id
      renewalEmailedAt
    }
  }
`;

async function createViewer(options: { staff: boolean }) {
  const userAccount = await factory.UserAccount.create();
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");
  await userAccount.user.$query().patch({ staff: options.staff });
  await userAccount.$fetchGraph("user");

  return { userAccount, user: userAccount.user };
}

type Viewer = Awaited<ReturnType<typeof createViewer>>;

async function createApp(viewer: Viewer) {
  return createApolloServerApp(apolloServer, createApolloMiddleware, {
    user: viewer.user,
    account: viewer.userAccount,
  });
}

/**
 * A team on Pro since 2021, so its periods reset on the 1st, whose running
 * period comes to `amount`: the $100 plan, plus screenshots past its quota of
 * 1,000 at $0.50.
 */
async function createProTeam(input: {
  amount: number;
  subscription?: Partial<Subscription>;
}) {
  const [teamAccount, plan] = await Promise.all([
    factory.TeamAccount.create(),
    factory.Plan.create({
      name: "pro",
      usageBased: true,
      interval: "month",
      includedScreenshots: 1000,
    }),
  ]);
  const subscription = await factory.Subscription.create({
    accountId: teamAccount.id,
    planId: plan.id,
    includedScreenshots: 1000,
    currency: "usd",
    flatPrice: 100,
    additionalScreenshotPrice: 0.5,
    createdAt: new Date("2021-01-01").toISOString(),
    startDate: new Date("2021-01-01").toISOString(),
    ...input.subscription,
  });
  const project = await factory.Project.create({ accountId: teamAccount.id });
  await factory.ScreenshotBucket.create({
    projectId: project.id,
    screenshotCount: 1000 + (input.amount - 100) / 0.5,
  });
  return { teamAccount, subscription };
}

async function queryEnterprise(viewer: Viewer) {
  const app = await createApp(viewer);
  const res = await request(app)
    .post("/graphql")
    .send({ query: EnterpriseQuery });
  expectNoGraphQLError(res);
  return res.body.data.staffEnterprise as {
    candidates: {
      id: string;
      team: { id: string };
      currency: string;
      currentPeriodAmount: number | null;
      previousPeriodAmount: number | null;
      staffContactedAt: string | null;
    }[];
    trials: {
      id: string;
      team: { id: string };
      includedScreenshots: number;
      periodStart: string;
      periodEnd: string;
      periodScreenshots: number;
    }[];
    contracts: {
      id: string;
      team: { id: string };
      plan: { interval: string };
      currency: string;
      amount: number | null;
      includedScreenshots: number | null;
      periodStart: string | null;
      periodEnd: string | null;
      periodScreenshots: number | null;
      previousPeriodAmount: number | null;
      renewalEmailedAt: string | null;
    }[];
  };
}

async function queryOffers(viewer: Viewer) {
  const { candidates } = await queryEnterprise(viewer);
  return candidates;
}

/**
 * A team on a plan of its own since 2021, so its periods open on January 1st,
 * with `screenshots` uploaded in the running period.
 */
async function createContractTeam(input: {
  plan: { name: string; interval: "month" | "year"; usageBased: boolean };
  flatPrice: number;
  screenshots: number;
}) {
  const [teamAccount, plan] = await Promise.all([
    factory.TeamAccount.create(),
    factory.Plan.create({ ...input.plan, includedScreenshots: 100_000 }),
  ]);
  const subscription = await factory.Subscription.create({
    accountId: teamAccount.id,
    planId: plan.id,
    includedScreenshots: 100_000,
    currency: "eur",
    flatPrice: input.flatPrice,
    additionalScreenshotPrice: 0.002,
    createdAt: new Date("2021-01-01").toISOString(),
    startDate: new Date("2021-01-01").toISOString(),
  });
  const project = await factory.Project.create({ accountId: teamAccount.id });
  await factory.ScreenshotBucket.create({
    projectId: project.id,
    screenshotCount: input.screenshots,
  });
  return { teamAccount, subscription };
}

describe("GraphQL staffEnterprise", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("lists the Pro teams the Billing page offers Enterprise to", async () => {
    const viewer = await createViewer({ staff: true });
    const [offered] = await Promise.all([
      createProTeam({ amount: 1500 }),
      createProTeam({ amount: 1499.5 }),
      // A deal below the list price per screenshot: sales already know them.
      createProTeam({
        amount: 1500,
        subscription: { additionalScreenshotPrice: 0.002 },
      }),
    ]);

    await expect(queryOffers(viewer)).resolves.toEqual([
      {
        id: offered.subscription.id,
        team: { id: offered.teamAccount.id },
        currency: "USD",
        currentPeriodAmount: 1500,
        // The plan alone: nothing was uploaded the month before.
        previousPeriodAmount: 100,
        staffContactedAt: null,
      },
    ]);
  });

  it("leaves out a team on a granted plan", async () => {
    const viewer = await createViewer({ staff: true });
    const { teamAccount } = await createProTeam({ amount: 5000 });
    const granted = await factory.Plan.create({ name: "enterprise" });
    await teamAccount.$query().patch({ forcedPlanId: granted.id });

    await expect(queryOffers(viewer)).resolves.toEqual([]);
  });

  it("lists the teams on an Enterprise plan with their running period", async () => {
    const viewer = await createViewer({ staff: true });
    const [monthly, yearly] = await Promise.all([
      createContractTeam({
        plan: { name: "enterprise", interval: "month", usageBased: true },
        flatPrice: 900,
        screenshots: 40_000,
      }),
      createContractTeam({
        plan: { name: "Entreprise Annual", interval: "year", usageBased: true },
        flatPrice: 10_800,
        screenshots: 60_000,
      }),
      // A legacy flat plan is paid and not Pro, yet not Enterprise.
      createContractTeam({
        plan: { name: "standard", interval: "month", usageBased: false },
        flatPrice: 50,
        screenshots: 1000,
      }),
    ]);

    const { contracts } = await queryEnterprise(viewer);
    const byId = new Map(contracts.map((contract) => [contract.id, contract]));
    expect(contracts).toHaveLength(2);
    expect(byId.get(monthly.subscription.id)).toMatchObject({
      team: { id: monthly.teamAccount.id },
      plan: { interval: "month" },
      currency: "EUR",
      amount: 900,
      includedScreenshots: 100_000,
      periodScreenshots: 40_000,
      // The plan alone: nothing was uploaded the month before.
      previousPeriodAmount: 900,
    });
    const year = byId.get(yearly.subscription.id);
    expect(year).toMatchObject({
      plan: { interval: "year" },
      amount: 10_800,
      periodScreenshots: 60_000,
    });
    // A yearly term opens and renews on the anniversary of the subscription.
    invariant(year?.periodStart && year.periodEnd, "yearly period missing");
    const start = new Date(year.periodStart);
    const end = new Date(year.periodEnd);
    expect([start.getUTCMonth(), start.getUTCDate()]).toEqual([0, 1]);
    expect(end.getUTCFullYear() - start.getUTCFullYear()).toBe(1);
    expect([end.getUTCMonth(), end.getUTCDate()]).toEqual([0, 1]);
  });

  it("lists the teams on the Enterprise trial plan with this month's usage", async () => {
    const viewer = await createViewer({ staff: true });
    const [trialPlan, openSourcePlan] = await Promise.all([
      factory.Plan.create({
        name: "enterprise-trial",
        usageBased: false,
        includedScreenshots: 300_000,
      }),
      factory.Plan.create({ name: "open source", usageBased: false }),
    ]);
    const [trialing, openSource] = await Promise.all([
      factory.TeamAccount.create({ forcedPlanId: trialPlan.id }),
      // Granted too, but not to try Enterprise.
      factory.TeamAccount.create({ forcedPlanId: openSourcePlan.id }),
    ]);
    await Promise.all(
      [trialing, openSource].map(async (account) => {
        const project = await factory.Project.create({ accountId: account.id });
        await factory.ScreenshotBucket.create({
          projectId: project.id,
          screenshotCount: 45_000,
        });
      }),
    );

    const { trials, contracts } = await queryEnterprise(viewer);
    expect(contracts).toEqual([]);
    expect(trials).toMatchObject([
      {
        id: trialing.id,
        team: { id: trialing.id },
        includedScreenshots: 300_000,
        periodScreenshots: 45_000,
      },
    ]);
    // A granted plan's period is the calendar month.
    const [trial] = trials;
    invariant(trial, "trial missing");
    expect(new Date(trial.periodStart).getDate()).toBe(1);
    expect(new Date(trial.periodEnd).getDate()).toBe(1);
  });

  it("records the renewal emails of the running term", async () => {
    const viewer = await createViewer({ staff: true });
    const { teamAccount, subscription } = await createContractTeam({
      plan: { name: "Entreprise Annual", interval: "year", usageBased: true },
      flatPrice: 10_800,
      screenshots: 60_000,
    });
    invariant(teamAccount.teamId, "team account has no team");
    // Written about last year's renewal: the term since started over.
    await TeamOutreach.query().insert({
      createdAt: new Date("2021-12-15").toISOString(),
      teamId: teamAccount.teamId,
      userId: viewer.user.id,
      subscriptionId: subscription.id,
      type: "enterprise_renewal",
    });
    const [before] = (await queryEnterprise(viewer)).contracts;
    expect(before?.renewalEmailedAt).toBeNull();

    const app = await createApp(viewer);
    const res = await request(app)
      .post("/graphql")
      .send({
        query: LogRenewalEmailMutation,
        variables: { subscriptionId: subscription.id },
      });
    expectNoGraphQLError(res);
    const logged = res.body.data.logStaffEnterpriseRenewalEmail;
    expect(logged.id).toBe(subscription.id);
    expect(logged.renewalEmailedAt).not.toBeNull();

    const [after] = (await queryEnterprise(viewer)).contracts;
    expect(after?.renewalEmailedAt).toBe(logged.renewalEmailedAt);
  });

  it("records that the team was emailed the offer, then clears it", async () => {
    const viewer = await createViewer({ staff: true });
    const { subscription } = await createProTeam({ amount: 1500 });
    const app = await createApp(viewer);

    async function setContact(contacted: boolean) {
      const res = await request(app)
        .post("/graphql")
        .send({
          query: SetContactMutation,
          variables: { subscriptionId: subscription.id, contacted },
        });
      expectNoGraphQLError(res);
      return res.body.data.setStaffEnterpriseOfferContact.staffContactedAt as
        | string
        | null;
    }

    const contactedAt = await setContact(true);
    expect(contactedAt).not.toBeNull();
    // Marking it again keeps the first date.
    await expect(setContact(true)).resolves.toBe(contactedAt);
    await expect(queryOffers(viewer)).resolves.toMatchObject([
      { staffContactedAt: contactedAt },
    ]);
    await expect(setContact(false)).resolves.toBeNull();
  });

  it("is refused to non-staff users", async () => {
    const viewer = await createViewer({ staff: false });
    const { subscription } = await createProTeam({ amount: 1500 });
    const app = await createApp(viewer);

    const list = await request(app)
      .post("/graphql")
      .send({ query: EnterpriseQuery });
    expect(list.body.errors[0].extensions.code).toBe("FORBIDDEN");

    const mark = await request(app)
      .post("/graphql")
      .send({
        query: SetContactMutation,
        variables: { subscriptionId: subscription.id, contacted: true },
      });
    expect(mark.body.errors[0].extensions.code).toBe("FORBIDDEN");
  });
});
