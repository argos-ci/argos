import { describe, expect, test } from "vitest";

import { Account, type Plan, type Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { claimPlanLimitAlert } from "./plan-limit";

const INCLUDED_SCREENSHOTS = 1000;

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

async function consume(project: Project, ratio: number) {
  await factory.ScreenshotBucket.create({
    projectId: project.id,
    screenshotCount: Math.round(INCLUDED_SCREENSHOTS * ratio),
  });
}

/**
 * Claim from a freshly loaded account, as build creation does: the
 * subscription manager caches the usage on the instance.
 */
async function claim(account: Account) {
  const fresh = await Account.query().findById(account.id).throwIfNotFound();
  const claim = await claimPlanLimitAlert(fresh);
  return claim?.alert.threshold ?? null;
}

describe("claimPlanLimitAlert", () => {
  withFlatRateTeam("claims nothing below 90%", async ({ account, project }) => {
    await consume(project, 0.89);
    await expect(claim(account)).resolves.toBeNull();
  });

  withFlatRateTeam(
    "claims 90% once, then 110% once builds are rejected",
    async ({ account, project }) => {
      await consume(project, 0.9);
      await expect(claim(account)).resolves.toBe(90);
      await expect(claim(account)).resolves.toBeNull();
      // Exactly 110% is still accepted, so the alert saying builds are
      // rejected must wait for the next screenshot.
      await consume(project, 0.2);
      await expect(claim(account)).resolves.toBeNull();
      await consume(project, 0.01);
      await expect(claim(account)).resolves.toBe(110);
      await expect(claim(account)).resolves.toBeNull();
    },
  );

  withFlatRateTeam(
    "claims only 110% when both thresholds are reached at once",
    async ({ account, project }) => {
      await consume(project, 1.5);
      await expect(claim(account)).resolves.toBe(110);
      await expect(claim(account)).resolves.toBeNull();
    },
  );

  withFlatRateTeam(
    "claims again in a new billing period",
    async ({ account, project }) => {
      await consume(project, 1.5);
      await account.$query().patch({
        lastPlanLimitAlertThreshold: 110,
        lastPlanLimitAlertAt: new Date("2021-01-15").toISOString(),
      });
      await expect(claim(account)).resolves.toBe(110);
      await expect(claim(account)).resolves.toBeNull();
    },
  );

  withFlatRateTeam(
    "lets a single concurrent run claim a threshold",
    async ({ account, project }) => {
      await consume(project, 1.5);
      const alerts = await Promise.all([claim(account), claim(account)]);
      expect(alerts.filter((alert) => alert !== null)).toHaveLength(1);
    },
  );

  withFlatRateTeam(
    "claims nothing on a usage-based plan",
    async ({ plan, account, project }) => {
      await plan.$query().patch({ usageBased: true });
      await consume(project, 1.5);
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
    await consume(project, 1.5);
    const fresh = await Account.query().findById(account.id).throwIfNotFound();
    await expect(claimPlanLimitAlert(fresh)).resolves.toMatchObject({
      alert: { threshold: 110, planKind: "hobby", planName: "Hobby" },
    });
  });
});
