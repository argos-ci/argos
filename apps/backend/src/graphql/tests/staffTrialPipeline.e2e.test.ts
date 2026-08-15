import { addDays, isSameDay } from "@argos/util/date";
import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const TrialPipelineQuery = `
  query StaffTrialPipeline($days: Int!) {
    staffTrialPipeline(days: $days) {
      id
      slug
      staff {
        projectsCount
        buildsCount
        screenshotsCount
        firstComparisonAt
        periodUsage {
          plan {
            id
            name
          }
          billingPeriods {
            from
            to
            closed
            additionalScreenshotsCost
          }
        }
      }
    }
  }
`;

/**
 * Create a user account, optionally flagged as staff, to authenticate with.
 */
async function createViewer(options: { staff: boolean }) {
  const userAccount = await factory.UserAccount.create();
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");
  await userAccount.user.$query().patch({ staff: options.staff });
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");

  return { userAccount, user: userAccount.user };
}

async function queryPipeline(
  auth: Awaited<ReturnType<typeof createViewer>>,
  days: number,
) {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    {
      user: auth.user,
      account: auth.userAccount,
    },
  );

  return request(app)
    .post("/graphql")
    .send({ query: TrialPipelineQuery, variables: { days } });
}

/**
 * Pick a team out of the result by id. Creating a build pulls a whole factory
 * chain behind it — screenshot bucket, project, and its own team account — so
 * the result holds incidental teams and position is not a safe way to index it.
 */
function findEntry(res: request.Response, teamId: string) {
  const entry = res.body.data.staffTrialPipeline.find(
    (team: { id: string }) => team.id === teamId,
  );
  invariant(entry, `team ${teamId} missing from the pipeline`);
  return entry;
}

describe("GraphQL staffTrialPipeline", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("is forbidden to non-staff users", async () => {
    const viewer = await createViewer({ staff: false });
    await factory.TeamAccount.create();

    const res = await queryPipeline(viewer, 30);

    expect(res.body.errors[0].extensions.code).toBe("FORBIDDEN");
  });

  it("only returns teams created within the window, newest first", async () => {
    const viewer = await createViewer({ staff: true });

    const old = await factory.TeamAccount.create({
      slug: "too-old",
      createdAt: addDays(new Date(), -45).toISOString(),
    });
    const recent = await factory.TeamAccount.create({
      slug: "recent",
      createdAt: addDays(new Date(), -20).toISOString(),
    });
    const newest = await factory.TeamAccount.create({
      slug: "newest",
      createdAt: addDays(new Date(), -1).toISOString(),
    });

    const res = await queryPipeline(viewer, 30);

    expectNoGraphQLError(res);
    expect(
      res.body.data.staffTrialPipeline.map((team: any) => team.slug),
    ).toEqual([newest.slug, recent.slug]);
    expect(
      res.body.data.staffTrialPipeline.map((team: any) => team.id),
    ).not.toContain(old.id);
  });

  it("prices the billing periods of a converted trial", async () => {
    const viewer = await createViewer({ staff: true });
    const team = await factory.TeamAccount.create({
      createdAt: addDays(new Date(), -88).toISOString(),
    });
    const project = await factory.Project.create({ accountId: team.id });
    const plan = await factory.Plan.create({
      name: "pro",
      usageBased: true,
      interval: "month",
    });
    const subscriber = await factory.User.create();
    const subscription = await factory.Subscription.create({
      accountId: team.id,
      planId: plan.id,
      provider: "stripe",
      stripeSubscriptionId: "sub_converted_trial",
      subscriberId: subscriber.id,
      createdAt: addDays(new Date(), -88).toISOString(),
      startDate: addDays(new Date(), -14).toISOString(),
      trialEndDate: addDays(new Date(), -85).toISOString(),
      status: "active",
      paymentMethodFilled: true,
      includedScreenshots: 35_000,
      additionalScreenshotPrice: 0.005,
      currency: "usd",
    });
    const [, closedStart] = subscription.getPeriodStarts(
      new Date(),
      "month",
      2,
    );
    invariant(closedStart, "the period before the running one");
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      screenshotCount: 50_000,
      storybookScreenshotCount: 0,
      createdAt: new Date(closedStart.getTime() + 3_600_000).toISOString(),
    });

    const res = await queryPipeline(viewer, 90);

    expectNoGraphQLError(res);
    const { periodUsage } = findEntry(res, team.id).staff;
    expect(periodUsage.plan.name).toBe("pro");
    // The period still running comes first, then the one that closed with 15k
    // screenshots past the 35k included, at $0.005.
    expect(periodUsage.billingPeriods).toMatchObject([
      { closed: false, additionalScreenshotsCost: 0 },
      { closed: true, additionalScreenshotsCost: 75 },
    ]);
  });

  it("reports a team that created a project but never built", async () => {
    const viewer = await createViewer({ staff: true });
    const team = await factory.TeamAccount.create();
    await factory.Project.create({ accountId: team.id });

    const res = await queryPipeline(viewer, 30);

    expectNoGraphQLError(res);
    const entry = findEntry(res, team.id);
    expect(entry).toMatchObject({
      id: team.id,
      staff: { projectsCount: 1, buildsCount: 0, screenshotsCount: 0 },
    });
    // No build means no comparison either.
    expect(entry.staff.firstComparisonAt).toBeNull();
  });

  it("does not count an orphan build as a comparison", async () => {
    const viewer = await createViewer({ staff: true });
    const team = await factory.TeamAccount.create();
    const project = await factory.Project.create({ accountId: team.id });
    await factory.Build.create({ projectId: project.id, type: "orphan" });

    const res = await queryPipeline(viewer, 30);

    expectNoGraphQLError(res);
    const entry = findEntry(res, team.id);
    expect(entry.staff.buildsCount).toBe(1);
    // An orphan build has no baseline: the team has not seen a diff yet.
    expect(entry.staff.firstComparisonAt).toBeNull();
  });

  it("reports the first check build as the first comparison", async () => {
    const viewer = await createViewer({ staff: true });
    const team = await factory.TeamAccount.create();
    const project = await factory.Project.create({ accountId: team.id });

    await factory.Build.create({
      projectId: project.id,
      type: "orphan",
      createdAt: addDays(new Date(), -5).toISOString(),
    });
    await factory.Build.create({
      projectId: project.id,
      type: "check",
      createdAt: addDays(new Date(), -3).toISOString(),
    });
    await factory.Build.create({
      projectId: project.id,
      type: "check",
      createdAt: addDays(new Date(), -1).toISOString(),
    });

    const res = await queryPipeline(viewer, 30);

    expectNoGraphQLError(res);
    const entry = findEntry(res, team.id);
    expect(entry.staff.buildsCount).toBe(3);
    // The earliest *check* build wins — not the earlier orphan one, nor the
    // later check.
    expect(
      isSameDay(
        new Date(entry.staff.firstComparisonAt),
        addDays(new Date(), -3),
      ),
    ).toBe(true);
  });

  it("sums screenshots across builds", async () => {
    const viewer = await createViewer({ staff: true });
    const team = await factory.TeamAccount.create();
    const project = await factory.Project.create({ accountId: team.id });

    const stats = {
      failure: 0,
      added: 0,
      unchanged: 0,
      changed: 0,
      removed: 0,
      retryFailure: 0,
      ignored: 0,
    };
    await factory.Build.create({
      projectId: project.id,
      stats: { ...stats, total: 12 },
    });
    await factory.Build.create({
      projectId: project.id,
      stats: { ...stats, total: 30 },
    });

    const res = await queryPipeline(viewer, 30);

    expectNoGraphQLError(res);
    expect(findEntry(res, team.id).staff.screenshotsCount).toBe(42);
  });

  it("counts projects once even when they have many builds", async () => {
    const viewer = await createViewer({ staff: true });
    const team = await factory.TeamAccount.create();
    const project = await factory.Project.create({ accountId: team.id });
    await factory.Build.createMany(3, { projectId: project.id, type: "check" });

    const res = await queryPipeline(viewer, 30);

    expectNoGraphQLError(res);
    const entry = findEntry(res, team.id);
    // The join to builds multiplies project rows; the count must stay at 1.
    expect(entry.staff.projectsCount).toBe(1);
    expect(entry.staff.buildsCount).toBe(3);
  });
});
