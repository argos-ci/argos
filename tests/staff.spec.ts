/* oxlint-disable no-empty-pattern */
import type { BuildType } from "@argos/schemas/build-type";
import { expect, test, type Page } from "@playwright/test";

import type { Account } from "../apps/backend/src/database/models";
import {
  Build,
  Plan as PlanModel,
  ScreenshotBucket,
  StripeInvoice,
  StripeInvoiceSync,
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

/** The first instant of the month `offset` months from now, in UTC. */
function startOfUTCMonth(offset: number) {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1),
  );
}

type RevenueBook = {
  /** The teams the mirror was seeded for, by the name the page shows. */
  monthlyTeam: string;
  dollarTeam: string;
  contractTeam: string;
  /** What a month of the contract comes to, as the page prints it. */
  contractPerMonth: string;
  /** The days last month's two invoices were raised, as the page prints them. */
  monthlyInvoiceDate: string;
  dollarInvoiceDate: string;
};

/**
 * A mirror of invoices to read a revenue page from.
 *
 * Dated against the running month rather than fixed, because the page reports
 * the last thirteen calendar months: a fixed date would fall out of the window
 * a month after it was written.
 */
const revenueTest = staffTest.extend<{ revenueBook: RevenueBook }>({
  revenueBook: async ({ user }, use, testInfo) => {
    const prefix = `revenue-${getUniqueTestIdentifier(testInfo)}`;
    const [monthlyPlan, annualPlan] = await Promise.all([
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
        name: "enterprise annual",
        includedScreenshots: 1_000_000,
        usageBased: true,
        githubSsoIncluded: true,
        fineGrainedAccessControlIncluded: true,
        samlIncluded: true,
        interval: "year",
      }),
    ]);

    async function createTeam(input: {
      slug: string;
      name: string;
      planId: string;
    }) {
      const { account } = await createTeamAccount({
        slug: `${prefix}-${input.slug}`,
        name: input.name,
      });
      await account
        .$query()
        .patch({ stripeCustomerId: `cus_${prefix}-${input.slug}` });
      await Subscription.query().insert({
        planId: input.planId,
        accountId: account.id,
        provider: "stripe",
        stripeSubscriptionId: `sub_${prefix}-${input.slug}`,
        subscriberId: user.user.id,
        startDate: daysFromNow(-400),
        endDate: null,
        paymentMethodFilled: true,
        status: "active",
      });
      return account;
    }

    /** A team that was invoiced, then left: no subscription, invoices kept. */
    async function createChurnedTeam(input: { slug: string; name: string }) {
      const { account } = await createTeamAccount({
        slug: `${prefix}-${input.slug}`,
        name: input.name,
      });
      await account
        .$query()
        .patch({ stripeCustomerId: `cus_${prefix}-${input.slug}` });
      return account;
    }

    const monthlyTeam = "Kruger Industrial";
    const dollarTeam = "Wernham Hogg";
    const contractTeam = "Bluth Company";
    await Promise.all([
      createTeam({
        slug: "kruger",
        name: monthlyTeam,
        planId: monthlyPlan.id,
      }),
      createTeam({
        slug: "wernham",
        name: dollarTeam,
        planId: monthlyPlan.id,
      }),
      createTeam({
        slug: "bluth",
        name: contractTeam,
        planId: annualPlan.id,
      }),
      createChurnedTeam({ slug: "sterling", name: "Sterling Cooper" }),
    ]);

    const lastMonth = new Date(
      startOfUTCMonth(-1).getTime() + 5 * 24 * 3600 * 1000,
    );
    // A week after the dollar team's bill, on the lighter team: the breakdown
    // opens newest invoice first, and only a date order that disagrees with
    // the heaviest-first order the backend sends can show which one won.
    const lastMonthLater = new Date(
      startOfUTCMonth(-1).getTime() + 12 * 24 * 3600 * 1000,
    );
    await StripeInvoice.query().insert([
      // Two teams billed last month, one of them in dollars: the page states
      // euros, so the row has to show both what Stripe charged and what it
      // converts to.
      {
        stripeInvoiceId: `in_${prefix}-kruger-last`,
        stripeCustomerId: `cus_${prefix}-kruger`,
        stripeCreatedAt: lastMonthLater.toISOString(),
        status: "paid",
        billingReason: "subscription_cycle",
        currency: "eur",
        total: 50_000,
        totalExcludingTax: 50_000,
        creditedAmountExcludingTax: 0,
      },
      {
        stripeInvoiceId: `in_${prefix}-wernham-last`,
        stripeCustomerId: `cus_${prefix}-wernham`,
        stripeCreatedAt: lastMonth.toISOString(),
        status: "paid",
        billingReason: "subscription_cycle",
        currency: "usd",
        total: 100_000,
        totalExcludingTax: 100_000,
        creditedAmountExcludingTax: 0,
      },
      // The month before, so the month after it has something to compare
      // against — without it every row's change is an em dash and the column
      // is never rendered at all.
      {
        stripeInvoiceId: `in_${prefix}-kruger-before`,
        stripeCustomerId: `cus_${prefix}-kruger`,
        stripeCreatedAt: new Date(
          startOfUTCMonth(-2).getTime() + 5 * 24 * 3600 * 1000,
        ).toISOString(),
        status: "paid",
        billingReason: "subscription_cycle",
        currency: "eur",
        total: 100_000,
        totalExcludingTax: 100_000,
        creditedAmountExcludingTax: 0,
      },
      // The running month, so the second card has something partial to report.
      {
        stripeInvoiceId: `in_${prefix}-kruger-running`,
        stripeCustomerId: `cus_${prefix}-kruger`,
        stripeCreatedAt: new Date().toISOString(),
        status: "paid",
        billingReason: "subscription_cycle",
        currency: "eur",
        total: 10_000,
        totalExcludingTax: 10_000,
        creditedAmountExcludingTax: 0,
      },
      // A team that has since churned off a yearly contract keeps the renewal
      // it was sent. Nothing about its subscription says "annual" any more —
      // only the invoice's own period does — so this is what stands between a
      // year's contract and a twelvefold spike in the month it was raised.
      {
        stripeInvoiceId: `in_${prefix}-sterling-renewal`,
        stripeCustomerId: `cus_${prefix}-sterling`,
        stripeCreatedAt: lastMonth.toISOString(),
        status: "paid",
        billingReason: "subscription_cycle",
        currency: "eur",
        total: 4_800_000,
        totalExcludingTax: 4_800_000,
        creditedAmountExcludingTax: 0,
        periodStart: startOfUTCMonth(-13).toISOString(),
        periodEnd: startOfUTCMonth(-1).toISOString(),
      },
      // An annual contract raised last month: it must stay out of that month's
      // monthly figures and be amortized over the year it covers instead.
      {
        stripeInvoiceId: `in_${prefix}-bluth-contract`,
        stripeCustomerId: `cus_${prefix}-bluth`,
        stripeCreatedAt: lastMonth.toISOString(),
        status: "paid",
        billingReason: "subscription_cycle",
        currency: "eur",
        total: 1_200_000,
        totalExcludingTax: 1_200_000,
        creditedAmountExcludingTax: 0,
        periodStart: startOfUTCMonth(-1).toISOString(),
        periodEnd: startOfUTCMonth(11).toISOString(),
      },
    ]);

    // The page refuses a window the mirror was never swept for, so the sweep
    // has to be on record before it will report anything.
    await StripeInvoiceSync.query().insert({
      // Deep enough for the window the page asks for, plus the year of
      // contracts that can still be paying for its first months.
      sinceDate: startOfUTCMonth(-36).toISOString(),
      completedAt: new Date().toISOString(),
    });

    // The contract covers twelve months from this month's start, so a month
    // of it is its amount over that stretch, weighted by this month's length.
    const termMs = startOfUTCMonth(12).getTime() - startOfUTCMonth(0).getTime();
    const monthMs = startOfUTCMonth(1).getTime() - startOfUTCMonth(0).getTime();
    const contractPerMonth = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format((12_000 * monthMs) / termMs);

    const dateFormat = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeZone: "UTC",
    });

    await use({
      monthlyTeam,
      dollarTeam,
      contractTeam,
      contractPerMonth,
      monthlyInvoiceDate: dateFormat.format(lastMonthLater),
      dollarInvoiceDate: dateFormat.format(lastMonth),
    });
  },
});

revenueTest.describe("staff revenue", () => {
  // One browser project, not both: the page has no filter, so every figure on
  // it is a sum over all the teams in the database — and the projects share
  // one, truncated once. Seeded twice, the totals double and the assertions
  // below describe neither run. The skip is declared here so the fixture never
  // seeds for the project that does not run it.
  revenueTest.skip(
    ({ browserName }) => browserName !== "chromium",
    "the page sums every team, so it can only be seeded once",
  );

  revenueTest("staff revenue", async ({ page, revenueBook }) => {
    test.slow();
    await page.goto("/staff/revenue");
    await expect(page.getByRole("heading", { name: "Revenue" })).toBeVisible();

    // €500 from one team and $1,000 from the other, the dollars converted at the
    // page's fixed rate: €500 + €855.
    await expect(page.getByText("€1,355 monthly").first()).toBeVisible();

    const monthlyPlans = page
      .locator("table")
      .filter({ has: page.getByRole("columnheader", { name: "ARPU" }) });
    const lastMonthRow = monthlyPlans.locator("tbody tr").nth(1);
    await expect(lastMonthRow.getByText("€1,355")).toBeVisible();
    // Two teams invoiced, so the average is half the month. Neither of the two
    // annual bills raised that same month is in either figure — not the current
    // contract, and not the churned team's renewal, whose only mark of being a
    // year's worth is the period on the invoice itself.
    await expect(lastMonthRow.getByText("€678")).toBeVisible();
    // €1,000 the month before, so the column reports the climb rather than the
    // em dash it falls back to with nothing to divide by.
    await expect(lastMonthRow.getByText("+36%")).toBeVisible();

    await lastMonthRow.getByRole("button", { name: "View details" }).click();
    const breakdown = monthlyPlans.locator("tbody tr").nth(2);
    await expect(breakdown.getByText(revenueBook.monthlyTeam)).toBeVisible();
    // What Stripe charged, beside what the page counts it as.
    await expect(breakdown.getByText("$1,000.00")).toBeVisible();
    await expect(breakdown.getByText("€855")).toBeVisible();
    // Each line carries the day its invoice was raised.
    await expect(
      breakdown.getByText(revenueBook.monthlyInvoiceDate),
    ).toBeVisible();
    await expect(
      breakdown.getByText(revenueBook.dollarInvoiceDate),
    ).toBeVisible();

    // Newest invoice first to open: the monthly team was billed a week after
    // the dollar team, so it leads even though it weighs less — the date
    // orders the breakdown, not the heaviest-first payload the backend sends.
    const breakdownRows = breakdown.locator("tbody tr");
    await expect(breakdownRows.nth(0)).toContainText(revenueBook.monthlyTeam);
    await expect(breakdownRows.nth(0).locator("td").first()).toHaveText("1");
    await expect(breakdownRows.nth(1)).toContainText(revenueBook.dollarTeam);
    await expect(breakdownRows.nth(1).locator("td").first()).toHaveText("2");

    // The contract is listed on its own, with the invoice its figure is read
    // from and what a month of it comes to — its twelve months are not all the
    // same length, so the share of this one is what the row reports.
    const contractRow = page
      .getByRole("row")
      .filter({ hasText: revenueBook.contractTeam });
    // Twice over: what Stripe charged, and what the page counts it as — the
    // contract is in euros, so both cells read the same.
    await expect(contractRow.getByText("€12,000.00")).toHaveCount(2);
    await expect(
      contractRow.getByText(revenueBook.contractPerMonth),
    ).toBeVisible();

    // Scoped to the monthly table: the contracts table below lists every annual
    // team in the database, which the rest of the suite seeds too.
    await screenshot(page, "staff-revenue-monthly-plans", {
      element: monthlyPlans,
    });

    // After the screenshot: the baseline is worth having in the order the
    // breakdown opens in.
    // Sorting by weight reverses the two, and the ranks follow the rows rather
    // than travelling with them.
    await breakdown.getByRole("button", { name: "In euros" }).click();
    await expect(breakdownRows.nth(0)).toContainText(revenueBook.dollarTeam);
    await expect(breakdownRows.nth(0).locator("td").first()).toHaveText("1");
  });
});

loggedTest("staff pages are refused to regular users", async ({ page }) => {
  // Every staff page, not just one: each owns its own query, so each has to
  // turn the refusal into something a reader can act on rather than into a
  // figure that failed to load.
  for (const path of ["/staff/teams", "/staff/trials", "/staff/revenue"]) {
    await page.goto(path);
    await expect(page.getByText("Access restricted")).toBeVisible();
  }
});
