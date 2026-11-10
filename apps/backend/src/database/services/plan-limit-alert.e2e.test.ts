import { PLAN_LIMIT_WARNING_RATIO } from "@argos/schemas/plan-limit";
import { describe, expect, test } from "vitest";

import {
  Account,
  FLAT_RATE_MAX_CONSUMPTION_RATIO,
  type Plan,
  type Project,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { claimPlanLimitAlert } from "./plan-limit-alert";

const INCLUDED_SCREENSHOTS = 1000;
const WARNING_SCREENSHOTS = Math.round(
  INCLUDED_SCREENSHOTS * PLAN_LIMIT_WARNING_RATIO,
);
/** The most a flat-rate plan may use before its builds are rejected. */
const MAX_SCREENSHOTS = Math.round(
  INCLUDED_SCREENSHOTS * FLAT_RATE_MAX_CONSUMPTION_RATIO,
);

type Ctx = {
  plan: Plan;
  /** Team on a flat-rate GitHub Marketplace plan. */
  account: Account;
  project: Project;
};

const withFlatRateTeam = test.extend<Ctx>({
  plan: async ({}, use) => {
    await setupDatabase();
    const plan = await factory.Plan.create({
      name: "starter",
      usageBased: false,
      includedScreenshots: INCLUDED_SCREENSHOTS,
    });
    await use(plan);
  },
  account: async ({ plan }, use) => {
    const account = await factory.TeamAccount.create();
    await factory.Subscription.create({
      accountId: account.id,
      planId: plan.id,
      provider: "github",
      startDate: new Date("2021-01-01").toISOString(),
    });
    await use(account);
  },
  project: async ({ account }, use) => {
    const project = await factory.Project.create({ accountId: account.id });
    await use(project);
  },
});

async function consume(project: Project, screenshotCount: number) {
  await factory.ScreenshotBucket.create({
    projectId: project.id,
    screenshotCount,
  });
}

/**
 * Claim from a freshly loaded account, as build creation does: the
 * subscription manager caches the usage on the instance.
 */
async function claim(account: Account) {
  const fresh = await Account.query().findById(account.id).throwIfNotFound();
  const claim = await claimPlanLimitAlert(fresh);
  return claim?.alert.level ?? null;
}

describe("claimPlanLimitAlert", () => {
  withFlatRateTeam(
    "claims nothing below the warning",
    async ({ account, project }) => {
      await consume(project, WARNING_SCREENSHOTS - 1);
      await expect(claim(account)).resolves.toBeNull();
    },
  );

  withFlatRateTeam(
    "claims the warning once, then the rejection once builds are rejected",
    async ({ account, project }) => {
      await consume(project, WARNING_SCREENSHOTS);
      await expect(claim(account)).resolves.toBe("warning");
      await expect(claim(account)).resolves.toBeNull();
      // The limit itself is still accepted, so the alert saying builds are
      // rejected must wait for the next screenshot.
      await consume(project, MAX_SCREENSHOTS - WARNING_SCREENSHOTS);
      await expect(claim(account)).resolves.toBeNull();
      await consume(project, 1);
      await expect(claim(account)).resolves.toBe("rejected");
      await expect(claim(account)).resolves.toBeNull();
    },
  );

  withFlatRateTeam(
    "claims only the rejection when both levels are reached at once",
    async ({ account, project }) => {
      await consume(project, MAX_SCREENSHOTS + 1);
      await expect(claim(account)).resolves.toBe("rejected");
      await expect(claim(account)).resolves.toBeNull();
    },
  );

  withFlatRateTeam(
    "claims again in a new billing period",
    async ({ account, project }) => {
      await consume(project, MAX_SCREENSHOTS + 1);
      await account.$query().patch({
        lastPlanLimitAlertLevel: "rejected",
        lastPlanLimitAlertAt: new Date("2021-01-15").toISOString(),
      });
      await expect(claim(account)).resolves.toBe("rejected");
      await expect(claim(account)).resolves.toBeNull();
    },
  );

  withFlatRateTeam(
    "lets a single concurrent run claim an alert",
    async ({ account, project }) => {
      await consume(project, MAX_SCREENSHOTS + 1);
      const alerts = await Promise.all([claim(account), claim(account)]);
      expect(alerts.filter((alert) => alert !== null)).toHaveLength(1);
    },
  );

  withFlatRateTeam(
    "claims nothing on a usage-based plan",
    async ({ plan, account, project }) => {
      await plan.$query().patch({ usageBased: true });
      await consume(project, MAX_SCREENSHOTS + 1);
      await expect(claim(account)).resolves.toBeNull();
    },
  );

  test("tells a personal account it is on the Hobby plan", async () => {
    await setupDatabase();
    await factory.Plan.create({
      name: "free",
      usageBased: false,
      includedScreenshots: INCLUDED_SCREENSHOTS,
    });
    const account = await factory.UserAccount.create();
    const project = await factory.Project.create({ accountId: account.id });
    await consume(project, MAX_SCREENSHOTS + 1);
    const fresh = await Account.query().findById(account.id).throwIfNotFound();
    await expect(claimPlanLimitAlert(fresh)).resolves.toMatchObject({
      alert: { level: "rejected", planKind: "hobby", planName: "Hobby" },
    });
  });
});
