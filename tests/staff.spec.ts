/* oxlint-disable no-empty-pattern */
import type { BuildType } from "@argos/schemas/build-type";
import { expect, test, type Page } from "@playwright/test";

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
  /** Days since the trial ended, for a team that converted. */
  trialEndedDaysAgo?: number;
  /**
   * Days until the trial ends, for a team still inside one.
   *
   * Stripe never invoices trial usage, so such a team opens no billed period —
   * which is precisely the row the Screenshots column has to report anyway.
   */
  trialEndsInDays?: number;
  /** Where the running period opened, which sets the billing anniversary. */
  periodStartDaysAgo: number;
  /** What the plan costs per month, as Stripe holds it — null when Argos has
   * not read it yet, which every subscription is until its next sync. */
  flatPrice: number | null;
  /** Screenshots uploaded during each closed period, most recent first. */
  screenshotsByClosedPeriod: number[];
  /**
   * Screenshots uploaded since the running period opened, which is what the
   * Screenshots column reports. Left out where the team has yet to build into
   * the period it is in — a real state, and the one that reads as zero.
   */
  screenshotsInRunningPeriod?: number;
}): Promise<Account> {
  const runningTrial = input.trialEndsInDays;
  const { account } = await createTeamAccount({
    slug: input.slug,
    name: input.name,
  });
  await account.$query().patch({
    createdAt: daysFromNow(-input.createdDaysAgo),
    // A billed team reached checkout, so it has a Stripe customer and its row
    // carries the third link. Without one the Links column renders two links
    // out of three and never reaches the width it needs.
    stripeCustomerId: `cus_${input.slug}`,
  });

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
    trialEndDate:
      runningTrial === undefined
        ? daysFromNow(-(input.trialEndedDaysAgo ?? 0))
        : daysFromNow(runningTrial),
    paymentMethodFilled: true,
    status: runningTrial === undefined ? "active" : "trialing",
    flatPrice: input.flatPrice,
    includedScreenshots: 35_000,
    additionalScreenshotPrice: 0.005,
    additionalStorybookScreenshotPrice: 0.002,
    currency: "usd",
  });

  // Read off the plan rather than taken as an argument: the backend prices
  // against `plan.interval`, so a caller free to state its own could seed every
  // bucket on monthly boundaries a yearly aggregate never looks at — the
  // overage would silently read zero and the assertions would still pass.
  const plan = await PlanModel.query().findById(input.planId).throwIfNotFound();
  const periodStarts = subscription.getPeriodStarts(
    new Date(),
    plan.interval,
    input.screenshotsByClosedPeriod.length + 1,
  );
  const project = await createProject({
    accountId: account.id,
    name: "usage",
  });

  // Index 0 is the period still running, so the closed ones start at 1.
  const volumes = [
    ...(input.screenshotsInRunningPeriod === undefined
      ? []
      : [{ index: 0, screenshotCount: input.screenshotsInRunningPeriod }]),
    ...input.screenshotsByClosedPeriod.map((screenshotCount, index) => ({
      index: index + 1,
      screenshotCount,
    })),
  ];

  // One build per period, rather than a bare bucket: the Screenshots column is
  // summed off build stats while billing reads the buckets, and in real data
  // every bucket comes from a build. Sequential because the build number is
  // resolved with a `max(number) + 1` sub-query.
  for (const { index, screenshotCount } of volumes) {
    const periodStart = periodStarts[index];
    if (!periodStart) {
      throw new Error("missing period");
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
    // need four more: `pro`, which the price estimate is built for, one that
    // is not, a granted one that bills nothing at all — each row naming its
    // plan when it is not Pro — and one billed by the year, whose amounts are
    // stated for a year rather than a month.
    const [proPlan, enterprisePlan, grantedPlan, annualPlan] =
      await Promise.all([
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
        PlanModel.query().insertAndFetch({
          name: "enterprise annual",
          includedScreenshots: 35_000,
          usageBased: true,
          githubSsoIncluded: true,
          fineGrainedAccessControlIncluded: true,
          samlIncluded: true,
          interval: "year",
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
        // Well inside the 35k quota with half the period still to run: the
        // column says so long before the invoice does.
        screenshotsInRunningPeriod: 12_340,
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
        // Already 6k past the quota, which is the whole point of the column:
        // the running amount has started moving with days still left on it.
        screenshotsInRunningPeriod: 41_000,
      }),
      // Billed by the year. Stripe states both halves of the amount for a year,
      // so the row has to quote the year — dividing it into a month would
      // report a figure that was never charged. Its previous period predates
      // the subscription row, which is why it has none.
      // Still inside its trial, and building. Stripe invoices no trial usage, so
      // this team opens no billed period at all — the two amount columns stay
      // empty — while the Screenshots column has to report what it consumes,
      // which is the whole signal for whether it converts.
      createBilledTeam({
        ...common,
        planId: proPlan.id,
        slug: `${prefix}-trialsonic`,
        name: "Trialsonic",
        createdDaysAgo: 10,
        trialEndsInDays: 4,
        periodStartDaysAgo: 10,
        flatPrice: 100,
        screenshotsByClosedPeriod: [],
        screenshotsInRunningPeriod: 5_625,
      }),
      createBilledTeam({
        ...common,
        planId: annualPlan.id,
        slug: `${prefix}-initrode`,
        name: "Initrode",
        createdDaysAgo: 400,
        trialEndedDaysAgo: 397,
        periodStartDaysAgo: 216,
        flatPrice: 12_000,
        screenshotsByClosedPeriod: [],
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
  await expect(page.getByText("Showing 1-9 of 9 teams")).toBeVisible();

  // A yearly subscription states its amounts for a year, so the column has to
  // quote the year. Read as a monthly rate this row is a twelfth of itself.
  await expect(page.getByRole("row", { name: /Initrode/ })).toContainText(
    "$12,000",
  );

  // Soylent is 12,340 into the 35k this month, well inside it — so the running
  // amount is still the flat price alone. On Pro, which includes the same
  // 35k on every row, the quota itself is left unsaid.
  const soylent = page.getByRole("row", { name: /Soylent/ });
  await expect(soylent).toContainText("12,340");
  await expect(soylent).not.toContainText("35,000");

  // Umbrella is on a contract, so its quota is named — and it is 6k past it
  // with days still to run: $750 flat plus $30 of overage, which is the figure
  // the column exists to explain.
  const umbrella = page.getByRole("row", { name: /Umbrella/ });
  await expect(umbrella).toContainText("41,000");
  await expect(umbrella).toContainText("/ 35,000");
  await expect(umbrella).toContainText("$780");

  // The running period is partial by construction, so what is left of it is
  // what tells a genuine drop from a period that simply opened three days ago.
  await expect(umbrella).toContainText(/\d+ days left/);

  // A trial is invoiced nothing, so it opens no billed period and both amount
  // columns stay empty — but what it consumes is exactly what says whether it
  // will convert, so the Screenshots column reports it all the same.
  const trialsonic = page.getByRole("row", { name: /Trialsonic/ });
  await expect(trialsonic).toContainText("5,625");
  await expect(trialsonic).toContainText("trialing");
  await expect(trialsonic).not.toContainText("$");

  await screenshot(page, "staff-all-teams");
});

staffTest(
  "staff teams filtered by billing interval",
  async ({ page, pipelineTeams }) => {
    await page.goto("/staff/teams");
    await page.getByRole("searchbox").fill(pipelineTeams.prefix);
    await expect(page.getByText("Showing 1-9 of 9 teams")).toBeVisible();

    // Narrowing to one interval is what makes the two period columns comparable
    // between rows: a year's amount next to a month's is an order of magnitude.
    await page.getByRole("combobox", { name: "Billing interval" }).click();
    await page.getByRole("option", { name: "Yearly" }).click();
    await expect(page.getByText("Showing 1-1 of 1 teams")).toBeVisible();
    await expect(page.getByRole("row", { name: /Initrode/ })).toBeVisible();

    // Every other team is on a monthly plan, trials and the granted one
    // included: the filter is on how a team is billed, not on whether it pays.
    await page.getByRole("combobox", { name: "Billing interval" }).click();
    await page.getByRole("option", { name: "Monthly" }).click();
    await expect(page.getByText("Showing 1-8 of 8 teams")).toBeVisible();
    await expect(page.getByRole("row", { name: /Initrode/ })).toBeHidden();

    // Ordering and filtering are applied on the server, on two different code
    // paths: narrowing to an interval has to keep the order the column asked
    // for — newest first, which is the default — rather than fall back to
    // whatever order it happened to read the rows in.
    await expect
      .poll(() => getTeamNames(page))
      .toEqual([
        "Northwind",
        "Globex",
        "Initech",
        "Trialsonic",
        "Hexagon",
        "Vandelay",
        "Umbrella",
        "Soylent",
      ]);
  },
);

staffTest(
  "staff teams show the table is busy while re-sorting",
  async ({ page, pipelineTeams }) => {
    await page.goto("/staff/teams");
    await page.getByRole("searchbox").fill(pipelineTeams.prefix);
    await expect(page.getByText("Showing 1-9 of 9 teams")).toBeVisible();

    // Ordering by an amount prices every billed team, which takes long enough
    // on real data to look like the click did nothing. Held here so the state
    // the delay produces can be asserted at all.
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/graphql", async (route) => {
      await held;
      await route.continue();
    });

    const table = page.getByRole("table");
    await page.getByRole("button", { name: "Last period" }).click();

    await expect(
      table.locator("xpath=ancestor::div[@aria-busy]"),
    ).toHaveAttribute("aria-busy", "true");
    // The rows already fetched stay readable underneath rather than being
    // replaced by a spinner.
    await expect(page.getByRole("row", { name: /Soylent/ })).toBeVisible();

    release();
    await expect(
      table.locator("xpath=ancestor::div[@aria-busy]"),
    ).toHaveAttribute("aria-busy", "false");
  },
);

/** The team names in the order the table renders them. */
async function getTeamNames(page: Page): Promise<string[]> {
  const names = await page
    .locator("tbody tr td:first-child .font-medium")
    .allInnerTexts();
  return names.map((name) => name.trim());
}

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
  await expect(page.getByText(/^Showing 4 of \d+ teams$/)).toBeVisible();
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
    await expect(page.getByText(/^Showing 8 of \d+ teams$/)).toBeVisible();

    // Soylent uploaded 50k screenshots over its last closed month: 15k past the
    // 35k included, at $0.005, on top of the $100 flat plan. The month still
    // running holds 12,340, well inside the quota, so reading that one instead
    // would print $100.
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
  // Every staff page, not just one: each owns its own query, so each has to
  // turn the refusal into something a reader can act on rather than into a
  // figure that failed to load.
  for (const path of ["/staff/teams", "/staff/trials", "/staff/revenue"]) {
    await page.goto(path);
    await expect(page.getByText("Access restricted")).toBeVisible();
  }
});
