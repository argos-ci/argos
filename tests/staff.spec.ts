/* oxlint-disable no-empty-pattern */
import type { BuildType } from "@argos/schemas/build-type";
import { expect, test } from "@playwright/test";

import type { Account } from "../apps/backend/src/database/models";
import {
  Build,
  Plan as PlanModel,
  ScreenshotBucket,
  Subscription,
} from "../apps/backend/src/database/models";
import {
  createProject,
  createTeamAccount,
  createUserAccount,
} from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { getUniqueTestIdentifier, screenshot } from "./util";

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function createBuilds(account: Account, types: BuildType[]) {
  if (types.length === 0) {
    return;
  }

  const project = await createProject({ accountId: account.id, name: "web" });
  const buckets = await ScreenshotBucket.query().insertAndFetch(
    types.map(() => ({
      name: "default",
      commit: "029b662f3ae57bae7a215301067262c1e95bbc95",
      branch: "main",
      projectId: project.id,
      complete: true,
      valid: true,
      screenshotCount: 24,
      storybookScreenshotCount: 0,
    })),
  );

  // Sequential on purpose: the build number is resolved with a
  // `max(number) + 1` sub-query, so a batch insert would hand the same number
  // to every row.
  for (const [index, type] of types.entries()) {
    await Build.query().insert({
      projectId: project.id,
      compareScreenshotBucketId: buckets[index]!.id,
      jobStatus: "complete",
      conclusion: "no-changes",
      type,
      stats: {
        total: 24,
        failure: 0,
        added: 0,
        unchanged: 24,
        changed: 0,
        removed: 0,
        retryFailure: 0,
        ignored: 0,
      },
    });
  }
}

/**
 * A team sitting at a given point of the pipeline. The builds drive the check
 * build column, the subscription drives the status and the bank info one.
 */
async function createPipelineTeam(input: {
  slug: string;
  name: string;
  planId: string;
  subscriberId: string;
  createdDaysAgo: number;
  trialDaysLeft: number | null;
  paymentMethodFilled: boolean;
  buildTypes: BuildType[];
}): Promise<Account> {
  const { account } = await createTeamAccount({
    slug: input.slug,
    name: input.name,
  });

  // Both tables sort by creation date, and these teams are created
  // concurrently — without an explicit date their order would differ from one
  // run to the next.
  await account
    .$query()
    .patch({ createdAt: daysFromNow(-input.createdDaysAgo) });

  const subscription = Subscription.query().insert({
    planId: input.planId,
    accountId: account.id,
    provider: "stripe",
    // `check_stripe_fields` requires both of these on a Stripe subscription.
    stripeSubscriptionId: `sub_${input.slug}`,
    subscriberId: input.subscriberId,
    startDate: daysFromNow(-3),
    endDate: null,
    trialEndDate:
      input.trialDaysLeft === null ? null : daysFromNow(input.trialDaysLeft),
    paymentMethodFilled: input.paymentMethodFilled,
    status: input.trialDaysLeft === null ? "active" : "trialing",
  });

  await Promise.all([subscription, createBuilds(account, input.buildTypes)]);

  return account;
}

/**
 * A team past its trial and billed by usage, with a screenshot volume placed
 * inside each of the periods that have closed since.
 *
 * The period boundaries are read back off the subscription rather than guessed
 * from day offsets: they follow the anniversary of `startDate`, so a fixed
 * "45 days ago" would land in one period or the next depending on the length of
 * the months the run happens to fall on.
 */
async function createBilledTeam(input: {
  slug: string;
  name: string;
  planId: string;
  subscriberId: string;
  createdDaysAgo: number;
  trialEndedDaysAgo: number;
  /** Where the running period opened, which sets the billing anniversary. */
  periodStartDaysAgo: number;
  /** What the plan costs per month, as Stripe holds it — null when Argos has
   * not read it yet, which every subscription is until its next sync. */
  flatPrice: number | null;
  /** Screenshots uploaded during each closed period, most recent first. */
  screenshotsByClosedPeriod: number[];
}): Promise<Account> {
  const { account } = await createTeamAccount({
    slug: input.slug,
    name: input.name,
  });
  await account
    .$query()
    .patch({ createdAt: daysFromNow(-input.createdDaysAgo) });

  const subscription = await Subscription.query().insertAndFetch({
    planId: input.planId,
    accountId: account.id,
    provider: "stripe",
    stripeSubscriptionId: `sub_${input.slug}`,
    subscriberId: input.subscriberId,
    // The row is as old as the team: periods that predate it are not billed.
    createdAt: daysFromNow(-input.createdDaysAgo),
    startDate: daysFromNow(-input.periodStartDaysAgo),
    endDate: null,
    trialEndDate: daysFromNow(-input.trialEndedDaysAgo),
    paymentMethodFilled: true,
    status: "active",
    flatPrice: input.flatPrice,
    includedScreenshots: 35_000,
    additionalScreenshotPrice: 0.005,
    additionalStorybookScreenshotPrice: 0.002,
    currency: "usd",
  });

  const periodStarts = subscription.getPeriodStarts(
    new Date(),
    "month",
    input.screenshotsByClosedPeriod.length + 1,
  );
  const project = await createProject({
    accountId: account.id,
    name: "usage",
  });

  // One build per closed period, rather than a bare bucket: the Screenshots
  // column is summed off build stats while billing reads the buckets, and in
  // real data every bucket comes from a build. Sequential because the build
  // number is resolved with a `max(number) + 1` sub-query.
  for (const [
    index,
    screenshotCount,
  ] of input.screenshotsByClosedPeriod.entries()) {
    // Index 0 is the period still running, so the closed ones start at 1.
    const periodStart = periodStarts[index + 1];
    if (!periodStart) {
      throw new Error("missing closed period");
    }
    const createdAt = new Date(periodStart.getTime() + 3_600_000).toISOString();
    const bucket = await ScreenshotBucket.query().insertAndFetch({
      name: "default",
      commit: "029b662f3ae57bae7a215301067262c1e95bbc95",
      branch: "main",
      projectId: project.id,
      complete: true,
      valid: true,
      screenshotCount,
      storybookScreenshotCount: 0,
      createdAt,
    });
    await Build.query().insert({
      projectId: project.id,
      compareScreenshotBucketId: bucket.id,
      jobStatus: "complete",
      conclusion: "no-changes",
      type: "check",
      createdAt,
      stats: {
        total: screenshotCount,
        failure: 0,
        added: 0,
        unchanged: screenshotCount,
        changed: 0,
        removed: 0,
        retryFailure: 0,
        ignored: 0,
      },
    });
  }

  return account;
}

type PipelineTeams = { prefix: string };

const staffTest = loggedTest.extend<{ pipelineTeams: PipelineTeams }>({
  /** The staff pages are gated on the `staff` flag, so the viewer needs it. */
  user: async ({}, use, testInfo) => {
    const id = getUniqueTestIdentifier(testInfo);
    const user = await createUserAccount({
      email: `staff-${id}@argos-ci.com`,
      name: "Alex Moreau",
      slug: `staff-${id}`,
      staff: true,
    });
    await use(user);
  },
  /**
   * A spread of pipeline states, so the captures show every rendering the
   * tables can produce rather than a column of identical rows. They share a
   * slug prefix, which each test uses to narrow the page down to them — every
   * other test in the suite creates a team too, and these pages list them all.
   */
  pipelineTeams: async ({ plan, user }, use, testInfo) => {
    const prefix = `pipeline-${getUniqueTestIdentifier(testInfo)}`;
    const common = { planId: plan.id, subscriberId: user.user.id };
    // The shared plan is flat, so it has no usage to price. The teams below
    // need three more: `pro`, which the price estimate is built for, one that
    // is not, and a granted one that bills nothing at all — each row naming
    // its plan when it is not Pro.
    const [proPlan, enterprisePlan, grantedPlan] = await Promise.all([
      PlanModel.query().insertAndFetch({
        name: "pro",
        includedScreenshots: 35_000,
        usageBased: true,
        githubSsoIncluded: true,
        fineGrainedAccessControlIncluded: true,
        samlIncluded: true,
        interval: "month",
      }),
      PlanModel.query().insertAndFetch({
        name: "enterprise",
        includedScreenshots: 35_000,
        usageBased: true,
        githubSsoIncluded: true,
        fineGrainedAccessControlIncluded: true,
        samlIncluded: true,
        interval: "month",
      }),
      PlanModel.query().insertAndFetch({
        name: "open source",
        includedScreenshots: 1_000_000,
        usageBased: false,
        githubSsoIncluded: true,
        fineGrainedAccessControlIncluded: true,
        samlIncluded: true,
        interval: "month",
      }),
    ]);
    await Promise.all([
      // A granted plan reads as active everywhere while billing nothing, so
      // its row carries no price — only the plan, which is what says why.
      createTeamAccount({
        slug: `${prefix}-hexagon`,
        name: "Hexagon",
        forcedPlanId: grantedPlan.id,
      }).then(({ account }) =>
        account.$query().patch({ createdAt: daysFromNow(-40) }),
      ),
      // Converted almost three months ago, so two periods have closed since:
      // 40k screenshots, then 50k. The row prices the most recent of the two.
      createBilledTeam({
        ...common,
        planId: proPlan.id,
        slug: `${prefix}-soylent`,
        name: "Soylent",
        createdDaysAgo: 88,
        trialEndedDaysAgo: 85,
        periodStartDaysAgo: 14,
        flatPrice: 100,
        screenshotsByClosedPeriod: [50_000, 40_000],
      }),
      // A contract whose amount Argos has not read yet: the row falls back to
      // the guess for its plan rather than to the cheapest plan we sell.
      createBilledTeam({
        ...common,
        planId: enterprisePlan.id,
        slug: `${prefix}-vandelay`,
        name: "Vandelay",
        createdDaysAgo: 70,
        trialEndedDaysAgo: 67,
        periodStartDaysAgo: 6,
        flatPrice: null,
        screenshotsByClosedPeriod: [20_000],
      }),
      // Same shape, on a contract with a negotiated amount of its own — the
      // row has to quote that rather than a constant.
      createBilledTeam({
        ...common,
        planId: enterprisePlan.id,
        slug: `${prefix}-umbrella`,
        name: "Umbrella",
        createdDaysAgo: 80,
        trialEndedDaysAgo: 77,
        flatPrice: 750,
        periodStartDaysAgo: 9,
        screenshotsByClosedPeriod: [60_000],
      }),
      createPipelineTeam({
        ...common,
        slug: `${prefix}-northwind`,
        createdDaysAgo: 1,
        name: "Northwind",
        trialDaysLeft: 2,
        paymentMethodFilled: false,
        buildTypes: [],
      }),
      createPipelineTeam({
        ...common,
        slug: `${prefix}-globex`,
        createdDaysAgo: 2,
        name: "Globex",
        trialDaysLeft: 11,
        paymentMethodFilled: false,
        buildTypes: ["orphan", "orphan"],
      }),
      createPipelineTeam({
        ...common,
        slug: `${prefix}-initech`,
        createdDaysAgo: 3,
        name: "Initech",
        trialDaysLeft: null,
        paymentMethodFilled: true,
        buildTypes: ["orphan", "check", "check"],
      }),
    ]);
    await use({ prefix });
  },
});

staffTest("staff all teams", async ({ page, pipelineTeams }) => {
  await page.goto("/staff/teams");
  await expect(page.getByRole("heading", { name: "All Teams" })).toBeVisible();
  await page.getByRole("searchbox").fill(pipelineTeams.prefix);
  await expect(page.getByText("Showing 1-7 of 7 teams")).toBeVisible();

  await screenshot(page, "staff-all-teams");
});

staffTest("staff trial pipeline", async ({ page, pipelineTeams }) => {
  test.slow();
  await page.goto("/staff/trials");
  await expect(
    page.getByRole("heading", { name: "Trial pipeline" }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill(pipelineTeams.prefix);
  // The page lists every team the suite created, and the trial labels below are
  // not unique among them — several fixtures seed the same spread. The count
  // only renders once the search has been applied (it runs through
  // `useDeferredValue`, so it lands a render late), which makes it the signal
  // that the table is down to this test's three teams.
  await expect(page.getByText(/^Showing 3 of \d+ teams$/)).toBeVisible();
  await expect(page.getByText("2d left")).toBeVisible();
  await expect(page.getByText("11d left")).toBeVisible();

  await screenshot(page, "staff-trial-pipeline");
});

staffTest(
  "staff trial pipeline over 90 days",
  async ({ page, pipelineTeams }) => {
    test.slow();
    await page.goto("/staff/trials?period=last90Days");
    await expect(
      page.getByRole("heading", { name: "Trial pipeline" }),
    ).toBeVisible();
    await page.getByRole("searchbox").fill(pipelineTeams.prefix);
    await expect(page.getByText(/^Showing 7 of \d+ teams$/)).toBeVisible();

    // Soylent uploaded 50k screenshots over its last closed month: 15k past the
    // 35k included, at $0.005, on top of the $100 flat plan. The month still
    // running holds nothing, so reading that one instead would print $100.
    await expect(page.getByText("$175")).toBeVisible();
    // Umbrella is on Enterprise: same 60k over the same quota, but its
    // contract is $750, read from the subscription rather than assumed. The row
    // names the plan under the amount to say so.
    await expect(page.getByText("$875")).toBeVisible();
    // Both Enterprise rows name their plan: the one quoting its contract and
    // the one falling back to a guess.
    await expect(page.getByText("Enterprise")).toHaveCount(2);
    // Hexagon is billed nothing at all, and the plan is the only thing that
    // says why — the price cell is an em dash.
    await expect(page.getByText("Open source")).toBeVisible();
    // Vandelay stayed inside its quota, and its own amount is unknown, so the
    // row shows the guess for an Enterprise contract rather than Pro's $100.
    await expect(page.getByText("$1,000")).toBeVisible();

    await screenshot(page, "staff-trial-pipeline-90-days");
  },
);

loggedTest("staff pages are refused to regular users", async ({ page }) => {
  await page.goto("/staff/trials");
  await expect(page.getByText("Access restricted")).toBeVisible();
});
