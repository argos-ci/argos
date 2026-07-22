/* eslint-disable no-empty-pattern */
import type { BuildType } from "@argos/schemas/build-type";
import { expect } from "@playwright/test";

import type { Account } from "../apps/backend/src/database/models";
import {
  Build,
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
    await Promise.all([
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
  await expect(page.getByText("Showing 1-3 of 3 teams")).toBeVisible();

  await screenshot(page, "staff-all-teams");
});

staffTest("staff trial pipeline", async ({ page, pipelineTeams }) => {
  await page.goto("/staff/trials");
  await expect(
    page.getByRole("heading", { name: "Trial pipeline" }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill(pipelineTeams.prefix);
  await expect(page.getByText("2d left")).toBeVisible();
  await expect(page.getByText("11d left")).toBeVisible();

  await screenshot(page, "staff-trial-pipeline");
});

loggedTest("staff pages are refused to regular users", async ({ page }) => {
  await page.goto("/staff/trials");
  await expect(page.getByText("Access restricted")).toBeVisible();
});
